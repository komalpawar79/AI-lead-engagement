import ExcelJS from 'exceljs';
import logger from '../utils/logger';

export interface ParsedLeadRecord {
  name: string;
  phone: string;
  email?: string;
  projectName?: string;
  requirement?: string;
  budget?: number;
  rowNumber: number;
}

export interface ExcelValidationError {
  rowNumber: number;
  field: string;
  message: string;
  rawRow: Record<string, any>;
}

export interface ExcelParseResult {
  totalRows: number;
  validRows: number;
  duplicatesCount: number;
  errorsCount: number;
  validRecords: ParsedLeadRecord[];
  errors: ExcelValidationError[];
}

export interface FollowUpExportData {
  id: string;
  leadName: string;
  phone: string;
  email?: string | null;
  projectName: string;
  requirement?: string | null;
  configuration?: string | null;
  budget?: number | null;
  interestLevel: string;
  followUpReason: string;
  summary?: string | null;
  callbackRequested?: boolean;
  siteVisitRequested?: boolean;
  priority: string;
  status: string;
  createdAt: Date;
}

class ExcelService {
  /**
   * Parse uploaded Excel or CSV buffer
   */
  public async parseLeadsExcel(buffer: Buffer): Promise<ExcelParseResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('The uploaded Excel file does not contain any worksheet.');
    }

    const headers: Record<number, string> = {};
    const validRecords: ParsedLeadRecord[] = [];
    const errors: ExcelValidationError[] = [];
    const seenPhones = new Set<string>();
    let duplicatesCount = 0;
    let totalRows = 0;

    // Read header row (Row 1)
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const val = cell.value ? cell.value.toString().trim().toLowerCase() : '';
      headers[colNumber] = val;
    });

    // Helper to find column index by matching aliases
    const findCol = (aliases: string[]): number | null => {
      for (const [col, name] of Object.entries(headers)) {
        if (aliases.some((alias) => name.includes(alias))) {
          return parseInt(col, 10);
        }
      }
      return null;
    };

    const nameCol = findCol(['name', 'customer', 'lead', 'client']);
    const phoneCol = findCol(['phone', 'mobile', 'contact', 'cell', 'number', 'tel']);
    const emailCol = findCol(['email', 'mail']);
    const projectCol = findCol(['project', 'property', 'society']);
    const reqCol = findCol(['requirement', 'config', 'configuration', 'looking for']);
    const budgetCol = findCol(['budget', 'price', 'cost']);

    // Iterate through data rows (Row 2 onwards)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      // Check if row is completely empty
      let hasValue = false;
      row.eachCell(() => {
        hasValue = true;
      });
      if (!hasValue) return;

      totalRows++;

      const getCellString = (col: number | null): string => {
        if (!col) return '';
        const cell = row.getCell(col);
        if (!cell || cell.value === null || cell.value === undefined) return '';
        if (typeof cell.value === 'object' && 'text' in cell.value) {
          return (cell.value as any).text.toString().trim();
        }
        return cell.value.toString().trim();
      };

      const rawName = getCellString(nameCol);
      const rawPhone = getCellString(phoneCol);
      const rawEmail = getCellString(emailCol);
      const rawProject = getCellString(projectCol);
      const rawReq = getCellString(reqCol);
      const rawBudget = getCellString(budgetCol);

      const rawRow = {
        name: rawName,
        phone: rawPhone,
        email: rawEmail,
        project: rawProject,
        requirement: rawReq,
        budget: rawBudget,
      };

      // Validation 1: Required Name
      if (!rawName) {
        errors.push({
          rowNumber,
          field: 'name',
          message: 'Lead name is required.',
          rawRow,
        });
        return;
      }

      // Validation 2: Required Phone
      if (!rawPhone) {
        errors.push({
          rowNumber,
          field: 'phone',
          message: 'Mobile number is required.',
          rawRow,
        });
        return;
      }

      // Validation 3: Clean & Validate Phone Number
      const cleanedPhone = rawPhone.replace(/\D/g, '');
      if (cleanedPhone.length < 10 || cleanedPhone.length > 13) {
        errors.push({
          rowNumber,
          field: 'phone',
          message: `Invalid mobile number: "${rawPhone}". Must be 10 to 13 digits.`,
          rawRow,
        });
        return;
      }

      // Validation 4: Duplicate Mobile in file
      if (seenPhones.has(cleanedPhone)) {
        duplicatesCount++;
        errors.push({
          rowNumber,
          field: 'phone',
          message: `Duplicate phone number in file: "${cleanedPhone}".`,
          rawRow,
        });
        return;
      }
      seenPhones.add(cleanedPhone);

      // Parse optional budget
      let parsedBudget: number | undefined;
      if (rawBudget) {
        const num = parseFloat(rawBudget.replace(/[^0-9.]/g, ''));
        if (!isNaN(num)) {
          // If less than 500, assume Lakhs (e.g. 80 -> 80,00,000)
          parsedBudget = num < 500 ? num * 100000 : num;
        }
      }

      validRecords.push({
        name: rawName,
        phone: cleanedPhone,
        email: rawEmail || undefined,
        projectName: rawProject || undefined,
        requirement: rawReq || undefined,
        budget: parsedBudget,
        rowNumber,
      });
    });

    return {
      totalRows,
      validRows: validRecords.length,
      duplicatesCount,
      errorsCount: errors.length,
      validRecords,
      errors,
    };
  }

  /**
   * Generate beautifully formatted Excel workbook for Follow-Up Leads
   */
  public async generateFollowUpsExcel(followUps: FollowUpExportData[]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AI LeadEngage';
    workbook.lastModifiedBy = 'AI LeadEngage Auto-Export';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Follow-up Leads', {
      views: [{ state: 'frozen', ySplit: 1 }],
      properties: { defaultRowHeight: 24 },
    });

    // Define columns
    worksheet.columns = [
      { header: 'Lead Name', key: 'leadName', width: 22 },
      { header: 'Mobile Number', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Project Name', key: 'projectName', width: 24 },
      { header: 'Configuration', key: 'configuration', width: 16 },
      { header: 'Budget (₹)', key: 'budget', width: 18 },
      { header: 'Interest Level', key: 'interestLevel', width: 16 },
      { header: 'Follow-up Reason', key: 'followUpReason', width: 32 },
      { header: 'Callback Req.', key: 'callbackRequested', width: 15 },
      { header: 'Site Visit Req.', key: 'siteVisitRequested', width: 15 },
      { header: 'AI Summary', key: 'summary', width: 45 },
      { header: 'Priority', key: 'priority', width: 14 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Identified At', key: 'createdAt', width: 20 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' }, // Slate-900 / Navy
      };
      cell.font = {
        name: 'Segoe UI',
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 11,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FFF97316' } }, // Warm orange line
      };
    });

    // Populate Data
    followUps.forEach((item, index) => {
      const budgetFormatted = item.budget
        ? `₹${(item.budget / 100000).toLocaleString('en-IN')} L`
        : 'Not Specified';

      const row = worksheet.addRow({
        leadName: item.leadName,
        phone: item.phone,
        email: item.email || '—',
        projectName: item.projectName,
        configuration: item.configuration || '—',
        budget: budgetFormatted,
        interestLevel: item.interestLevel,
        followUpReason: item.followUpReason,
        callbackRequested: item.callbackRequested ? 'YES' : 'NO',
        siteVisitRequested: item.siteVisitRequested ? 'YES' : 'NO',
        summary: item.summary || '—',
        priority: item.priority,
        status: item.status,
        createdAt: new Date(item.createdAt).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      });

      // Alternating row background for clean SaaS presentation
      const isEven = index % 2 === 0;
      row.height = 24;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', wrapText: colNumber === 11 };
        cell.font = { name: 'Segoe UI', size: 10 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' },
        };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        // Highlight High interest / Follow-up reason with pleasant green/orange tint
        if (colNumber === 7 && item.interestLevel === 'HIGH') {
          cell.font = { bold: true, color: { argb: 'FF16A34A' } };
        }
        if (colNumber === 9 && item.callbackRequested) {
          cell.font = { bold: true, color: { argb: 'FFEA580C' } };
        }
      });
    });

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }
}

export const excelService = new ExcelService();
export default excelService;
