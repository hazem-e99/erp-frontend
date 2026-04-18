import ExcelJS from 'exceljs';

interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: any, row?: any) => string | number;
  align?: 'left' | 'center' | 'right';
}

interface ExcelExportOptions {
  filename: string;
  sheetName: string;
  columns: ExcelColumn[];
  data: any[];
  title?: string;
}

/**
 * Export data to Excel with professional styling and colors
 */
export async function exportToExcel(options: ExcelExportOptions) {
  const { filename, sheetName, columns, data, title } = options;

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: title ? 3 : 1 }]
  });

  let currentRow = 1;

  // Add title row if provided
  if (title) {
    const titleRow = worksheet.getRow(currentRow);
    titleRow.height = 35;
    const titleCell = titleRow.getCell(1);
    titleCell.value = title;
    titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' }, // Blue-800
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.border = {
      top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      left: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      right: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    };
    
    // Merge title cells
    worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
    currentRow += 2; // Skip a row after title
  }

  // Add header row
  const headerRow = worksheet.getRow(currentRow);
  headerRow.height = 30;
  
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' }, // Blue-500
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF2563EB' } },
      left: { style: 'thin', color: { argb: 'FF60A5FA' } },
      bottom: { style: 'medium', color: { argb: 'FF2563EB' } },
      right: { style: 'thin', color: { argb: 'FF60A5FA' } },
    };
    
    // Set column width
    const maxLength = Math.max(
      col.header.length,
      ...data.map(row => {
        const val = col.format ? col.format(row[col.key], row) : row[col.key];
        return String(val || '').length;
      })
    );
    worksheet.getColumn(index + 1).width = Math.min(Math.max(maxLength + 4, col.width || 15), 60);
  });

  currentRow++;

  // Add data rows with styling
  data.forEach((item, rowIndex) => {
    const row = worksheet.getRow(currentRow);
    row.height = 25;
    
    const isEven = rowIndex % 2 === 0;

    columns.forEach((col, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      const value = item[col.key];
      const formattedValue = col.format ? col.format(value, item) : value;
      cell.value = formattedValue;

      // Determine alignment
      let alignment: 'left' | 'center' | 'right' = col.align || 'left';
      if (!col.align) {
        const cellValue = String(formattedValue || '');
        if (cellValue.startsWith('$') || (!isNaN(Number(cellValue)) && cellValue !== '')) {
          alignment = 'right';
        } else if (col.key === 'status' || cellValue.length < 15) {
          alignment = 'center';
        }
      }

      // Conditional colors for status
      let fillColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF'; // Slate-50 / White
      let fontColor = 'FF1F2937'; // Gray-800

      if (col.key === 'status') {
        const status = String(formattedValue || '').toLowerCase();
        if (status.includes('paid') || status.includes('active') || status.includes('completed')) {
          fillColor = isEven ? 'FFD1FAE5' : 'FFECFDF5'; // Green-100/50
          fontColor = 'FF065F46'; // Green-800
        } else if (status.includes('pending') || status.includes('overdue')) {
          fillColor = isEven ? 'FFFEF3C7' : 'FFFFFBEB'; // Amber-100/50
          fontColor = 'FF92400E'; // Amber-800
        } else if (status.includes('cancelled') || status.includes('inactive')) {
          fillColor = isEven ? 'FFFEE2E2' : 'FFFEF2F2'; // Red-100/50
          fontColor = 'FF991B1B'; // Red-800
        }
      }

      cell.font = { name: 'Calibri', size: 11, color: { argb: fontColor } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor },
      };
      cell.alignment = { vertical: 'middle', horizontal: alignment };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });

    currentRow++;
  });

  // Add auto-filter
  const headerRowNum = title ? 3 : 1;
  worksheet.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum, column: columns.length }
  };

  // Generate and download file
  const timestamp = new Date().toISOString().slice(0, 10);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${timestamp}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Format currency for Excel
 */
export function fmtExcelCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '$0.00';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format date for Excel
 */
export function fmtExcelDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Export complete finance report with all data in multiple sheets
 */
export async function exportCompleteFinanceReport(data: {
  subscriptions: any[];
  installments: any[];
  payments: any[];
  revenue: any[];
  expenses: any[];
  dashboardSummary?: any;
}) {
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = 'ERP Finance System';
  workbook.created = new Date();
  workbook.modified = new Date();

  const HEADER_COLOR = 'FF3B82F6'; // Blue-500
  const TITLE_COLOR = 'FF1E40AF'; // Blue-800

  // ==================== DASHBOARD SUMMARY SHEET ====================
  if (data.dashboardSummary) {
    const summarySheet = workbook.addWorksheet('Dashboard Summary', {
      views: [{ state: 'frozen', ySplit: 3 }]
    });

    let currentRow = 1;
    
    // Title
    const titleRow = summarySheet.getRow(currentRow);
    titleRow.height = 40;
    const titleCell = titleRow.getCell(1);
    titleCell.value = '💼 Finance Dashboard Summary';
    titleCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TITLE_COLOR } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.border = {
      top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      left: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      right: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    };
    summarySheet.mergeCells(currentRow, 1, currentRow, 4);
    currentRow += 2;

    // Headers
    const headerRow = summarySheet.getRow(currentRow);
    headerRow.height = 30;
    ['Metric', 'Value', 'Category', 'Status'].forEach((header, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = header;
      cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF2563EB' } },
        bottom: { style: 'medium', color: { argb: 'FF2563EB' } },
        left: { style: 'thin', color: { argb: 'FF60A5FA' } },
        right: { style: 'thin', color: { argb: 'FF60A5FA' } },
      };
    });
    currentRow++;

    // Summary Data
    const summaryData = [
      { metric: 'Total Cash In (YTD)', value: fmtExcelCurrency(data.dashboardSummary.totalCashIn), category: 'Revenue', status: '✓' },
      { metric: 'Total Cash Out (YTD)', value: fmtExcelCurrency(data.dashboardSummary.totalCashOut), category: 'Expenses', status: '✓' },
      { metric: 'Net Profit', value: fmtExcelCurrency(data.dashboardSummary.netProfit), category: 'Performance', status: data.dashboardSummary.netProfit >= 0 ? '✓' : '⚠' },
      { metric: 'Recognized Revenue (This Month)', value: fmtExcelCurrency(data.dashboardSummary.recognizedRevenueThisMonth), category: 'Revenue', status: '✓' },
      { metric: 'Outstanding Payments', value: fmtExcelCurrency(data.dashboardSummary.outstandingPayments), category: 'Receivables', status: data.dashboardSummary.outstandingPayments > 0 ? '⚠' : '✓' },
      { metric: 'Active Subscriptions', value: String(data.dashboardSummary.activeSubscriptions), category: 'Subscriptions', status: '✓' },
      { metric: 'Overdue Installments', value: String(data.dashboardSummary.overdueCount), category: 'Collections', status: data.dashboardSummary.overdueCount > 0 ? '❌' : '✓' },
    ];

    summaryData.forEach((item, idx) => {
      const row = summarySheet.getRow(currentRow);
      row.height = 25;
      const isEven = idx % 2 === 0;

      ['metric', 'value', 'category', 'status'].forEach((key, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.value = item[key as keyof typeof item];
        
        let fillColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF';
        let fontColor = 'FF1F2937';

        if (key === 'status') {
          if (item.status === '❌') {
            fillColor = 'FFFEE2E2';
            fontColor = 'FF991B1B';
          } else if (item.status === '⚠') {
            fillColor = 'FFFEF3C7';
            fontColor = 'FF92400E';
          } else {
            fillColor = 'FFD1FAE5';
            fontColor = 'FF065F46';
          }
        }

        cell.font = { name: 'Calibri', size: 11, color: { argb: fontColor }, bold: key === 'metric' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        cell.alignment = { vertical: 'middle', horizontal: colIdx === 0 ? 'left' : 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
      currentRow++;
    });

    // Set column widths
    summarySheet.getColumn(1).width = 35;
    summarySheet.getColumn(2).width = 20;
    summarySheet.getColumn(3).width = 20;
    summarySheet.getColumn(4).width = 12;
  }

  // ==================== SUBSCRIPTIONS SHEET ====================
  if (data.subscriptions.length > 0) {
    const subSheet = workbook.addWorksheet('Subscriptions', {
      views: [{ state: 'frozen', ySplit: 3 }]
    });

    await addSheetData(subSheet, {
      title: '📋 Subscriptions',
      columns: [
        { header: 'Customer', key: 'clientName', width: 25 },
        { header: 'Plan', key: 'planType', width: 15 },
        { header: 'Installments', key: 'installments', width: 15 },
        { header: 'Total Price', key: 'totalPrice', width: 15 },
        { header: 'Paid Amount', key: 'paidAmount', width: 15 },
        { header: 'Remaining', key: 'remaining', width: 15 },
        { header: 'Start Date', key: 'startDate', width: 15 },
        { header: 'End Date', key: 'endDate', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
      ],
      data: data.subscriptions.map(s => ({
        ...s,
        installments: `${s.paidInstallmentsCount || 0}/${s.totalInstallmentsCount || 0}`,
        totalPrice: fmtExcelCurrency(s.totalPrice),
        paidAmount: fmtExcelCurrency(s.paidAmount),
        remaining: fmtExcelCurrency(s.totalPrice - s.paidAmount),
        startDate: fmtExcelDate(s.startDate),
        endDate: fmtExcelDate(s.endDate),
      })),
    });
  }

  // ==================== INSTALLMENTS SHEET ====================
  if (data.installments.length > 0) {
    const instSheet = workbook.addWorksheet('Installments', {
      views: [{ state: 'frozen', ySplit: 3 }]
    });

    await addSheetData(instSheet, {
      title: '💳 Installments',
      columns: [
        { header: 'Customer', key: 'clientName', width: 25 },
        { header: 'Installment #', key: 'installmentInfo', width: 15 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Paid Amount', key: 'paidAmount', width: 15 },
        { header: 'Remaining', key: 'remaining', width: 15 },
        { header: 'Due Date', key: 'dueDate', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
      ],
      data: data.installments.map(i => ({
        ...i,
        installmentInfo: `${i.installmentNumber}/${i.totalInstallments}`,
        amount: fmtExcelCurrency(i.amount),
        paidAmount: fmtExcelCurrency(i.paidAmount),
        remaining: fmtExcelCurrency(i.amount - i.paidAmount),
        dueDate: fmtExcelDate(i.dueDate),
      })),
    });
  }

  // ==================== PAYMENTS SHEET ====================
  if (data.payments.length > 0) {
    const paySheet = workbook.addWorksheet('Payments', {
      views: [{ state: 'frozen', ySplit: 3 }]
    });

    await addSheetData(paySheet, {
      title: '💰 Payments',
      columns: [
        { header: 'Customer', key: 'clientName', width: 25 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Payment Date', key: 'paymentDate', width: 18 },
        { header: 'Method', key: 'method', width: 15 },
        { header: 'Reference', key: 'reference', width: 20 },
        { header: 'Overpayment', key: 'overpaymentAmount', width: 15 },
        { header: 'Notes', key: 'notes', width: 30 },
      ],
      data: data.payments.map(p => ({
        ...p,
        amount: fmtExcelCurrency(p.amount),
        paymentDate: fmtExcelDate(p.paymentDate),
        reference: p.reference || '—',
        overpaymentAmount: fmtExcelCurrency(p.overpaymentAmount || 0),
        notes: p.notes || '—',
      })),
    });
  }

  // ==================== REVENUE SHEET ====================
  if (data.revenue.length > 0) {
    const revSheet = workbook.addWorksheet('Revenue', {
      views: [{ state: 'frozen', ySplit: 3 }]
    });

    await addSheetData(revSheet, {
      title: '📈 Revenue Recognition',
      columns: [
        { header: 'Customer', key: 'clientName', width: 25 },
        { header: 'Description', key: 'description', width: 35 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Recognition Date', key: 'recognitionDate', width: 18 },
        { header: 'Period', key: 'periodMonth', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
      ],
      data: data.revenue.map(r => ({
        ...r,
        amount: fmtExcelCurrency(r.amount),
        recognitionDate: fmtExcelDate(r.recognitionDate),
      })),
    });
  }

  // ==================== EXPENSES SHEET ====================
  if (data.expenses.length > 0) {
    const expSheet = workbook.addWorksheet('Expenses', {
      views: [{ state: 'frozen', ySplit: 3 }]
    });

    await addSheetData(expSheet, {
      title: '📝 Expenses',
      columns: [
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Has Receipt', key: 'hasReceipt', width: 12 },
      ],
      data: data.expenses.map(e => ({
        ...e,
        amount: fmtExcelCurrency(e.amount),
        date: fmtExcelDate(e.date),
        hasReceipt: e.attachmentUrl ? 'Yes ✓' : 'No',
      })),
    });
  }

  // Download the workbook
  const timestamp = new Date().toISOString().slice(0, 10);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Complete_Finance_Report_${timestamp}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Helper function to add formatted data to a sheet
 */
async function addSheetData(worksheet: ExcelJS.Worksheet, options: {
  title: string;
  columns: Array<{ header: string; key: string; width: number }>;
  data: any[];
}) {
  const { title, columns, data } = options;
  const HEADER_COLOR = 'FF3B82F6';
  const TITLE_COLOR = 'FF1E40AF';

  let currentRow = 1;

  // Title
  const titleRow = worksheet.getRow(currentRow);
  titleRow.height = 35;
  const titleCell = titleRow.getCell(1);
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TITLE_COLOR } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  titleCell.border = {
    top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    left: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
    right: { style: 'medium', color: { argb: 'FF1E3A8A' } },
  };
  worksheet.mergeCells(currentRow, 1, currentRow, columns.length);
  currentRow += 2;

  // Headers
  const headerRow = worksheet.getRow(currentRow);
  headerRow.height = 30;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_COLOR } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF2563EB' } },
      bottom: { style: 'medium', color: { argb: 'FF2563EB' } },
      left: { style: 'thin', color: { argb: 'FF60A5FA' } },
      right: { style: 'thin', color: { argb: 'FF60A5FA' } },
    };
    worksheet.getColumn(idx + 1).width = col.width;
  });
  currentRow++;

  // Data rows
  data.forEach((item, rowIdx) => {
    const row = worksheet.getRow(currentRow);
    row.height = 25;
    const isEven = rowIdx % 2 === 0;

    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.value = item[col.key];

      let fillColor = isEven ? 'FFF8FAFC' : 'FFFFFFFF';
      let fontColor = 'FF1F2937';

      // Status column coloring
      if (col.key === 'status') {
        const status = String(item[col.key] || '').toLowerCase();
        if (status.includes('paid') || status.includes('active') || status.includes('completed') || status.includes('recognized')) {
          fillColor = isEven ? 'FFD1FAE5' : 'FFECFDF5';
          fontColor = 'FF065F46';
        } else if (status.includes('pending') || status.includes('overdue') || status.includes('partially')) {
          fillColor = isEven ? 'FFFEF3C7' : 'FFFFFBEB';
          fontColor = 'FF92400E';
        } else if (status.includes('cancelled') || status.includes('inactive')) {
          fillColor = isEven ? 'FFFEE2E2' : 'FFFEF2F2';
          fontColor = 'FF991B1B';
        }
      }

      cell.font = { name: 'Calibri', size: 11, color: { argb: fontColor } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
      cell.alignment = { 
        vertical: 'middle', 
        horizontal: item[col.key]?.toString().startsWith('$') ? 'right' : 'left' 
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    });
    currentRow++;
  });

  // Add auto-filter
  worksheet.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: columns.length }
  };
}

