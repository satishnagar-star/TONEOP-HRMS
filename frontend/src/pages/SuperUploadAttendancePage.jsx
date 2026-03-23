import React, { useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, AlertCircle, CheckCircle2, FileJson, Loader2, XCircle, Download, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

const REQUIRED_HEADERS = ["Code", "Employee", "Shift", "Date/Time", "Status"];

export function SuperUploadAttendancePage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState(null); // { total, ready, inserted, rejected }
  const [rawRows, setRawRows] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  const resetState = () => {
    setErrors([]);
    setStats(null);
    setRawRows(null);
    setShowConfirm(false);
    setIsValidated(false);
  };

  const validateData = async (rows) => {
    setLoading(true);
    setErrors([]);
    setStats(null);
    try {
      const response = await api.post('/attendance/upload', { documents: rows, dryRun: true });
      const data = response.data;
      if (data.success) {
        setStats({
          total: data.total_rows,
          ready: data.ready_rows,
          inserted: 0,
          rejected: data.rejected_rows
        });
        setErrors(data.errors || []);
        setIsValidated(true);
        if (data.rejected_rows > 0) {
          toast.error(`${data.rejected_rows} rows have validation issues.`);
        } else {
          toast.success("All rows are ready for load!");
        }
      }
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.error || err.message || 'Validation failed';
      toast.error(errorMsg);
      if (err.response?.data?.missing) {
         setErrors([{ row_number: 'Header', reason: `Missing required columns: ${err.response.data.missing.join(', ')}` }]);
      } else {
         setErrors([{ row_number: 'Validation', reason: errorMsg }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    resetState();
    setFile(uploadedFile);

    if (!uploadedFile.name.toLowerCase().endsWith('.csv')) {
      setErrors([{ row_number: 'N/A', reason: 'Invalid File Type. Only .csv is allowed.' }]);
      return;
    }

    Papa.parse(uploadedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setErrors([{ row_number: 'N/A', reason: 'File is empty.' }]);
          return;
        }
        setRawRows(results.data);
        validateData(results.data); // Auto-validate
      },
      error: (err) => setErrors([{ row_number: 'N/A', reason: `Failed to parse CSV: ${err.message}` }])
    });
  };

  const syncToMongo = async () => {
    if (!rawRows || rawRows.length === 0) return;
    
    setLoading(true);
    setShowConfirm(false);

    try {
      const response = await api.post('/attendance/upload', { documents: rawRows, dryRun: false });
      const data = response.data;

      if (data.success) {
        setStats({
          total: data.total_rows,
          ready: data.ready_rows,
          inserted: data.inserted_rows,
          rejected: data.rejected_rows
        });
        toast.success(`Successfully uploaded ${data.inserted_rows} records!`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || err.message || 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadErrorCsv = () => {
    if (errors.length === 0) return;

    // Filter out system errors that don't have original_row
    // and map to original row + Error column
    const rowsToExport = errors
      .filter(err => err.original_row)
      .map(err => ({
        ...err.original_row,
        "Error Reason": err.reason
      }));

    if (rowsToExport.length === 0) {
      toast.error("No record-specific errors to download.");
      return;
    }

    const csv = Papa.unparse(rowsToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `errors_${file?.name || 'upload'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-text">Upload Attendance Data</h1>
        <p className="text-sm text-black/55">Upload CSV file to process attendance. Validations and calculations are handled by the backend.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl bg-white shadow-soft ring-1 ring-black/5 p-6">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-brand-200 rounded-xl bg-brand-50/50 p-8 transition-colors hover:bg-brand-50">
              <UploadCloud className="mb-4 h-12 w-12 text-brand-500" />
              <h3 className="mb-1 text-base font-semibold text-text text-center">Upload CSV File</h3>
              <p className="mb-6 text-xs text-black/55 text-center">Format: Code, Employee, Shift, Date/Time, Status (IN/OUT)</p>
              
              <label className="cursor-pointer rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700">
                Browse Files
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  disabled={loading}
                  onClick={(e) => { e.target.value = null }}
                />
              </label>
              {file && <p className="mt-4 break-all rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800">{file.name}</p>}
            </div>
          </div>

          {isValidated && stats?.inserted === 0 && !showConfirm && (
            <button 
              onClick={() => setShowConfirm(true)}
              disabled={loading}
              className="flex w-full items-center justify-center space-x-2 rounded-xl bg-brand-600 px-8 py-3.5 font-bold text-white shadow-md transition-all hover:bg-brand-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>Sync to Backend</span>
            </button>
          )}

          {showConfirm && (
            <div className="rounded-2xl bg-brand-50 p-6 border-2 border-brand-200 animate-in fade-in zoom-in duration-200">
               <div className="text-center space-y-4">
                 <p className="text-sm font-bold text-brand-900">Are you sure to upload the data?</p>
                 <div className="flex gap-3">
                   <button
                     onClick={syncToMongo}
                     className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition-colors"
                   >
                     Sure
                   </button>
                   <button
                     onClick={() => setShowConfirm(false)}
                     className="flex-1 rounded-xl bg-white border border-brand-200 py-2.5 text-sm font-bold text-brand-600 hover:bg-brand-50 transition-colors"
                   >
                     No
                   </button>
                 </div>
               </div>
            </div>
          )}

          {stats && (
            <div className="space-y-3">
              {stats.inserted === 0 ? (
                <>
                  <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 p-4">
                    <div className="flex items-center space-x-3">
                      <FileJson className="h-5 w-5 text-brand-600" />
                      <span className="text-sm font-medium text-brand-900">Ready to Load</span>
                    </div>
                    <span className="text-lg font-bold text-brand-700">{stats.ready}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center space-x-3">
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium text-red-800">Rejection</span>
                    </div>
                    <span className="text-lg font-bold text-red-700">{stats.rejected}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between rounded-xl border border-success/20 bg-success/5 p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="text-sm font-medium text-success">Successfully Loaded</span>
                  </div>
                  <span className="text-lg font-bold text-success">{stats.inserted}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Preview & Errors */}
        <div className="lg:col-span-2 space-y-6">
          {rawRows && (
            <div className="rounded-2xl bg-white shadow-soft ring-1 ring-black/5 overflow-hidden">
               <div className="border-b border-black/5 bg-gray-50/50 px-6 py-4 flex items-center justify-between">
                 <div className="flex items-center space-x-2">
                   <Eye className="h-5 w-5 text-brand-600" />
                   <h2 className="font-bold text-text">Preview (Top 100 Rows)</h2>
                 </div>
                 <span className="text-xs font-medium text-black/40">Total {rawRows.length} rows loaded</span>
               </div>
               <div className="max-h-[400px] overflow-auto">
                 <table className="w-full text-left text-xs border-collapse">
                   <thead className="sticky top-0 bg-white shadow-sm ring-1 ring-black/5">
                     <tr>
                       {Object.keys(rawRows[0]).map((h, i) => (
                         <th key={i} className="px-4 py-3 font-semibold text-black/60 uppercase tracking-tight">{h}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-black/5">
                     {rawRows.slice(0, 100).map((row, idx) => (
                       <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                         {Object.values(row).map((val, i) => (
                           <td key={i} className="px-4 py-2.5 text-black/70">{val}</td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="rounded-2xl border border-red-100 bg-white shadow-soft overflow-hidden">
              <div className="border-b border-red-100 bg-red-50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <h2 className="font-bold">{stats ? 'Rejected Rows' : 'Validation Issues'} ({errors.length})</h2>
                </div>
                {errors.some(e => e.original_row) && (
                  <button 
                    onClick={downloadErrorCsv}
                    className="flex items-center space-x-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-200"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Errors</span>
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-red-50 shadow-sm">
                    <tr>
                      <th className="w-24 px-4 py-3 font-semibold text-red-800">Row No.</th>
                      <th className="px-4 py-3 font-semibold text-red-800">Reason / Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50">
                    {errors.map((err, i) => (
                      <tr key={i} className="transition-colors hover:bg-red-50/50">
                        <td className="px-4 py-3 font-medium text-red-600">{err.row_number || 'N/A'}</td>
                        <td className="px-4 py-3 text-red-700">{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
