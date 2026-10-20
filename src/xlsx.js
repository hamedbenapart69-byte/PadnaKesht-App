import { strToU8, zipSync } from 'fflate';

function xmlEsc(value) {
  return String(value ?? '').replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}
function columnName(index) {
  let name='', n=index+1;
  while(n>0){const remainder=(n-1)%26;name=String.fromCharCode(65+remainder)+name;n=Math.floor((n-1)/26);}
  return name;
}
function worksheetXml(rows) {
  const body=(rows||[]).map((row,rowIndex)=>{
    const cells=(row||[]).map((value,columnIndex)=>{
      const reference=columnName(columnIndex)+(rowIndex+1);
      if(typeof value==='number'&&Number.isFinite(value)){
        return '<c r="'+reference+'" t="n"><v>'+String(value)+'</v></c>';
      }
      return '<c r="'+reference+'" t="inlineStr"><is><t xml:space="preserve">'+xmlEsc(value)+'</t></is></c>';
    }).join('');
    return '<row r="'+(rowIndex+1)+'">'+cells+'</row>';
  }).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+body+'</sheetData></worksheet>';
}
export function buildXlsx(sheets) {
  if(!Array.isArray(sheets)||!sheets.length)throw new Error('برای ساخت فایل Excel دست‌کم یک برگه لازم است.');
  const names=new Set();
  for(const sheet of sheets){
    if(!sheet||typeof sheet.name!=='string'||!sheet.name.trim()||sheet.name.length>31||
       sheet.name.includes('/')||sheet.name.includes('\\')||/[*?:\[\]]/.test(sheet.name)||names.has(sheet.name)||!Array.isArray(sheet.rows)){
      throw new Error('نام یا ساختار یکی از برگه‌های Excel معتبر نیست.');
    }
    names.add(sheet.name);
  }
  const contentTypes='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
    '<Default Extension="xml" ContentType="application/xml"/>'+
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
    sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+
    '</Types>';
  const rootRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'+
    '</Relationships>';
  const workbook='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+
    sheets.map((sheet,i)=>'<sheet name="'+xmlEsc(sheet.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+
    '</sheets></workbook>';
  const workbookRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
    sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+
    '</Relationships>';
  const files={
    '[Content_Types].xml':strToU8(contentTypes),
    '_rels/.rels':strToU8(rootRels),
    'xl/workbook.xml':strToU8(workbook),
    'xl/_rels/workbook.xml.rels':strToU8(workbookRels)
  };
  sheets.forEach((sheet,i)=>{files['xl/worksheets/sheet'+(i+1)+'.xml']=strToU8(worksheetXml(sheet.rows));});
  return zipSync(files,{level:6});
}
