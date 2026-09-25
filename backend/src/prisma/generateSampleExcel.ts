import ExcelJS from 'exceljs';
import path from 'path';

async function createSampleExcel() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Raw Leads');

  sheet.columns = [
    { header: 'Name', key: 'name', width: 22 },
    { header: 'Mobile', key: 'phone', width: 18 },
    { header: 'Email', key: 'email', width: 26 },
    { header: 'Project', key: 'project', width: 22 },
    { header: 'Requirement', key: 'requirement', width: 18 },
    { header: 'Budget', key: 'budget', width: 16 },
  ];

  sheet.addRow({
    name: 'Kavita Iyer',
    phone: '9820556677',
    email: 'kavita.iyer@gmail.com',
    project: 'Godrej Horizon',
    requirement: '2 BHK Sea View',
    budget: 8500000,
  });

  sheet.addRow({
    name: 'Manish Chawla',
    phone: '9811443322',
    email: 'manish.c@hdfcbank.com',
    project: 'Godrej Horizon',
    requirement: '3 BHK High Rise',
    budget: 18000000,
  });

  sheet.addRow({
    name: 'Tanvi Nair',
    phone: '9940112233',
    email: 'tanvi.nair@accenture.com',
    project: 'Prestige Cyber City',
    requirement: '2 BHK with balcony',
    budget: 9500000,
  });

  sheet.addRow({
    name: 'Sameer Kulkarni',
    phone: '9766554433',
    email: 'sameer.k@tcs.com',
    project: 'Lodha Bellissimo',
    requirement: '3 BHK Ready',
    budget: 45000000,
  });

  const targetPath = path.resolve('sample_real_estate_leads.xlsx');
  await workbook.xlsx.writeFile(targetPath);
  console.log(`Sample Excel generated at: ${targetPath}`);
}

createSampleExcel();

