import React, { useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, AlertCircle, CheckCircle2, FileJson, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const REQUIRED_HEADERS = ["Code", "Employee", "Shift", "Attendance", "Status"];
const SHIFT_REGEX = /^\[\d{1,2}:\d{2}-\d{1,2}:\d{2}\]\[\d{1,2}:\d{2}\]$/;

const parseCustomDate = (str) => {
  if (!str) return null;
  try {
    const parts = str.trim().split(' ');
    if (parts.length < 2) return null;
    const d = parts[0].split(/[-/]/);
    const t = parts[1].split(':');
    if (d.length < 3 || t.length < 2) return null;
    const dateObj = new Date(d[2], d[1] - 1, d[0], t[0], t[1]);
    if (isNaN(dateObj.getTime())) return null;
    return dateObj;
  } catch (e) {
    return null;
  }
};

const formatTime = (dateObj) => {
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const mm = String(dateObj.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export function SuperUploadAttendancePage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [jsonData, setJsonData] = useState(null);

  const resetState = () => {
    setErrors([]);
    setSuccessMsg('');
    setJsonData(null);
    setFile(null);
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    resetState();
    setFile(uploadedFile);

    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      setErrors([{ row: 'N/A', reason: 'Invalid File Type. Only .csv is allowed.' }]);
      return;
    }

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => processCsvData(results.data, results.meta.fields),
      error: (err) => setErrors([{ row: 'N/A', reason: `Failed to parse CSV: ${err.message}` }])
    });
  };

  const processCsvData = (rows, headers) => {
    if (!headers) {
      setErrors([{ row: 'N/A', reason: 'File is empty or missing headers.' }]);
      return;
    }
    
    const lowerHeaders = headers.map(h => h.trim().toLowerCase());
    const missingHeaders = REQUIRED_HEADERS.filter(req => !lowerHeaders.includes(req.toLowerCase()));

    if (missingHeaders.length > 0) {
      setErrors([{ row: 'Header', reason: `Missing required columns: ${missingHeaders.join(', ')}` }]);
      return;
    }

    const colMap = {};
    REQUIRED_HEADERS.forEach(req => {
      const originalHeader = headers.find(h => h.trim().toLowerCase() === req.toLowerCase());
      colMap[req] = originalHeader;
    });

    const employeeData = {};
    const foundErrors = [];
    let hasValidRows = false;

    rows.forEach((row, index) => {
      const rowNum = index + 2;
      const code = row[colMap["Code"]]?.toString().trim();
      
      if (!code) return;

      try {
        const shiftStr = (row[colMap["Shift"]] || "").replace(/\s+/g, "");
        const status = (row[colMap["Status"]] || "").toUpperCase().trim();
        const attendanceStr = (row[colMap["Attendance"]] || "").trim();
        const employeeName = (row[colMap["Employee"]] || "").trim();

        if (!SHIFT_REGEX.test(shiftStr)) throw new Error("Invalid Shift Format");
        if (status !== "IN" && status !== "OUT") throw new Error("Status must be IN/OUT");
        
        const punchDate = parseCustomDate(attendanceStr);
        if (!punchDate) throw new Error("Invalid Date Format");

        hasValidRows = true;
        const dateKey = attendanceStr.split(' ')[0];
        
        if (!employeeData[code]) {
          employeeData[code] = { name: employeeName, logs: {} };
        }
        
        const emp = employeeData[code];
        if (!emp.logs[dateKey]) {
          emp.logs[dateKey] = { in: null, out: null };
        }

        if (status === "IN") {
          if (!emp.logs[dateKey].in || punchDate < emp.logs[dateKey].in) emp.logs[dateKey].in = punchDate;
        } else if (status === "OUT") {
          if (!emp.logs[dateKey].out || punchDate > emp.logs[dateKey].out) emp.logs[dateKey].out = punchDate;
        }
      } catch (err) {
        foundErrors.push({ row: rowNum, reason: err.message });
      }
    });

    if (foundErrors.length > 0) setErrors(foundErrors);

    if (hasValidRows) {
      const finalJson = generateCleanJson(employeeData);
      setJsonData(finalJson);
    } else {
      setErrors(prev => [...prev, { row: 'System', reason: 'No valid rows found to process.' }]);
    }
  };

  const generateCleanJson = (employeeData) => {
    return Object.keys(employeeData).map(code => {
      const emp = employeeData[code];
      return {
        employee_code: code,
        employee_name: emp.name,
        records: Object.keys(emp.logs).map(dateKey => {
          const log = emp.logs[dateKey];
          return {
            date: dateKey,
            time_in: log.in ? formatTime(log.in) : null,
            time_out: log.out ? formatTime(log.out) : null,
            status: (log.in && log.out) ? "Present" : "Halfday"
          };
        })
      };
    });
  };

  const syncToMongo = async () => {
    if (!jsonData || jsonData.length === 0) return;
    setLoading(true);
    setErrors([]);
    setSuccessMsg('');

    try {
      const response = await api.post('/attendance/upload', { documents: jsonData });
      if (response.data.success) {
        setSuccessMsg(`Successfully synced to MongoDB! Inserted ${jsonData.length} documents.`);
        toast.success('Attendance records uploaded via Data API successfully!');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to sync to MongoDB');
      setErrors([{ row: 'Sync', reason: err.response?.data?.error || err.message || 'Failed to sync to MongoDB' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text">Upload Attendance Data</h1>
        <p className="text-sm text-black/55">Upload CSV file to process attendance directly into MongoDB.</p>
      </div>

      <div className="rounded-2xl bg-white shadow-soft ring-1 ring-black/5 p-8">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-brand-200 rounded-xl bg-brand-50/50 p-12 transition-colors hover:bg-brand-50">
          <UploadCloud className="mb-4 h-16 w-16 text-brand-500" />
          <h3 className="mb-1 text-lg font-semibold text-text">Upload CSV File</h3>
          <p className="mb-6 text-sm text-black/55">Select or drag & drop a .csv file</p>
          
          <label className="cursor-pointer rounded-xl bg-brand-600 px-6 py-2.5 font-medium text-white shadow-sm transition-colors hover:bg-brand-700">
            Browse Files
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={loading}
            />
          </label>
          {file && <p className="mt-4 rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-800">{file.name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {errors.length > 0 && (
          <div className="col-span-1 md:col-span-2 rounded-2xl border border-red-100 bg-red-50 p-6">
            <div className="mb-4 flex items-center space-x-2 text-lg font-semibold text-red-700">
              <AlertCircle className="h-6 w-6" />
              <h2>Validation Issues ({errors.length})</h2>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-red-100 bg-white shadow-inner">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-red-100/50">
                  <tr>
                    <th className="w-24 px-4 py-3 font-semibold text-red-800">Row</th>
                    <th className="px-4 py-3 font-semibold text-red-800">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {errors.map((err, i) => (
                    <tr key={i} className="transition-colors hover:bg-red-50/50">
                      <td className="px-4 py-3 font-medium text-red-600">{err.row}</td>
                      <td className="px-4 py-3 text-red-700">{err.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="col-span-1 flex items-center space-x-4 rounded-2xl border border-success/20 bg-success/10 p-6 md:col-span-2">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-success" />
            <p className="text-lg font-medium text-success/80">{successMsg}</p>
          </div>
        )}

        {jsonData && !successMsg && (
           <div className="col-span-1 flex flex-col items-center justify-between gap-6 rounded-2xl border border-black/5 bg-white p-6 shadow-sm md:col-span-2 md:flex-row">
              <div className="flex items-start space-x-4">
                <div className="shrink-0 rounded-xl bg-brand-100 p-3">
                  <FileJson className="h-6 w-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-text">Ready to Sync</h3>
                  <p className="text-black/55">{jsonData.length} valid employee records processed.</p>
                </div>
              </div>

              <button 
                onClick={syncToMongo}
                disabled={loading}
                className="flex w-full items-center justify-center space-x-2 rounded-xl bg-success px-8 py-3 font-bold text-white shadow-md transition-all hover:bg-success/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <span>Push to MongoDB</span>
                )}
              </button>
           </div>
        )}
      </div>
    </div>
  );
}
