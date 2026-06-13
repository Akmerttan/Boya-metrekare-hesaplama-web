import { jsPDF } from 'jspdf';
import { Job } from '../types';

/**
 * Normalizes Turkish letters to safe characters to avoid character glitching in standard PDF fonts.
 */
function tr(str: string): string {
  if (!str) return '';
  const mapping: { [key: string]: string } = {
    'ı': 'i', 'İ': 'I',
    'ş': 's', 'Ş': 'S',
    'ğ': 'g', 'Ğ': 'G',
    'ü': 'u', 'Ü': 'U',
    'ö': 'o', 'Ö': 'O',
    'ç': 'c', 'Ç': 'C'
  };
  return str.split('').map(char => mapping[char] || char).join('');
}

export function generateJobPDF(job: Job) {
  const doc = new jsPDF();
  
  // Custom styling parameters
  const marginX = 20;
  let currentY = 20;
  
  // Draw header card
  doc.setFillColor(31, 41, 55); // Dark Slate Blue (#1F2937)
  doc.rect(15, currentY, 180, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(tr('BOYAHANE METREKARE HESAP FORMU'), 20, currentY + 16);
  
  currentY += 35;
  
  // Info Block (Two columns)
  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Musteri / Is Adi:'), marginX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(tr(job.musteriAdi || 'Belirtilmedi'), marginX + 35, currentY);
  
  currentY += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Tarih:'), marginX, currentY);
  doc.setFont('helvetica', 'normal');
  
  // Format Date gracefully for PDF
  const formattedDate = new Date(job.tarih).toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(formattedDate, marginX + 35, currentY);
  
  // Right Column (at X = 120)
  const rightColX = 120;
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Is ID:'), rightColX, currentY - 8);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${job.id.slice(0, 8).toUpperCase()}`, rightColX + 25, currentY - 8);
  
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Durum:'), rightColX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(tr('Hesaplandi / Kaydedildi'), rightColX + 25, currentY);
  
  doc.setTextColor(55, 65, 81); // restore text color
  currentY += 15;
  
  // Draw divider line
  doc.setDrawColor(209, 213, 219);
  doc.line(15, currentY, 195, currentY);
  currentY += 10;
  
  // Pieces Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(tr('Parca Olcu Detaylari'), marginX, currentY);
  currentY += 8;
  
  // Table headers styling
  doc.setFillColor(243, 244, 246);
  doc.rect(15, currentY, 180, 8, 'F');
  doc.setDrawColor(209, 213, 219);
  doc.rect(15, currentY, 180, 8, 'S');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('#', marginX, currentY + 5.5);
  doc.text(tr('En (cm)'), marginX + 15, currentY + 5.5);
  doc.text(tr('Boy (cm)'), marginX + 50, currentY + 5.5);
  doc.text(tr('Adet'), marginX + 85, currentY + 5.5);
  doc.text(tr('Birim Alan (m2)'), marginX + 115, currentY + 5.5);
  doc.text(tr('Toplam Alan (m2)'), marginX + 152, currentY + 5.5);
  
  currentY += 8;
  
  doc.setFont('helvetica', 'normal');
  job.parcalar.forEach((piece, index) => {
    // Check height to support pagination (highly professional edge-case)
    if (currentY > 260) {
      doc.addPage();
      currentY = 20;
      doc.setFillColor(243, 244, 246);
      doc.rect(15, currentY, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('#', marginX, currentY + 5.5);
      doc.text(tr('En (cm)'), marginX + 15, currentY + 5.5);
      doc.text(tr('Boy (cm)'), marginX + 50, currentY + 5.5);
      doc.text(tr('Adet'), marginX + 85, currentY + 5.5);
      doc.text(tr('Birim Alan (m2)'), marginX + 115, currentY + 5.5);
      doc.text(tr('Toplam Alan (m2)'), marginX + 152, currentY + 5.5);
      currentY += 8;
      doc.setFont('helvetica', 'normal');
    }

    // Draw row background for alternating colors
    if (index % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(15, currentY, 180, 8, 'F');
    }
    doc.setDrawColor(229, 231, 235);
    doc.rect(15, currentY, 180, 8, 'S');
    
    doc.text((index + 1).toString(), marginX, currentY + 5.5);
    doc.text(piece.en.toLocaleString('tr-TR', { minimumFractionDigits: 1 }) + ' cm', marginX + 15, currentY + 5.5);
    doc.text(piece.boy.toLocaleString('tr-TR', { minimumFractionDigits: 1 }) + ' cm', marginX + 50, currentY + 5.5);
    doc.text(piece.adet.toLocaleString('tr-TR') + ' adet', marginX + 85, currentY + 5.5);
    doc.text(piece.alan.toFixed(4) + ' m2', marginX + 115, currentY + 5.5);
    doc.text(piece.toplamAlan.toFixed(3) + ' m2', marginX + 152, currentY + 5.5);
    
    currentY += 8;
  });
  
  currentY += 8;
  
  // If box reaches near bottom, swap page for totals
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  // Totals calculations block
  doc.setFillColor(249, 250, 251);
  doc.rect(110, currentY, 85, 36, 'F');
  doc.setDrawColor(209, 213, 219);
  doc.rect(110, currentY, 85, 36, 'S');
  
  const innerLeftX = 114;
  const innerRightX = 158;
  let itemY = currentY + 8;
  
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Toplam Metrekare:'), innerLeftX, itemY);
  doc.setFont('helvetica', 'normal');
  doc.text(job.toplamMetrekare.toFixed(3) + ' m2', innerRightX, itemY);
  
  itemY += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(tr('Birim Fiyat (TL/m2):'), innerLeftX, itemY);
  doc.setFont('helvetica', 'normal');
  
  const unitPriceFormatted = job.birimFiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  doc.text(unitPriceFormatted, innerRightX, itemY);
  
  itemY += 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(tr('Toplam Tutar:'), innerLeftX, itemY);
  doc.setTextColor(220, 38, 38); // Strong red/crimson or bold
  
  const totalPriceFormatted = job.toplamTutar.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL';
  doc.text(totalPriceFormatted, innerRightX, itemY);
  
  doc.setTextColor(55, 65, 81); // Restore text color
  
  currentY += 45;
  
  // Signature areas
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.text(tr('Teslim Eden / Operator'), marginX + 15, currentY);
  doc.text(tr('Musteri / Is Sahibi Imza'), marginX + 115, currentY);
  
  // Signature dotted lines
  doc.setDrawColor(156, 163, 175);
  doc.line(marginX + 8, currentY + 15, marginX + 58, currentY + 15);
  doc.line(marginX + 108, currentY + 15, marginX + 158, currentY + 15);
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text(tr('Bu belge enxboy adet bazli metrekare yazilimi tarafindan otomatik olusturulmustur.'), marginX, 280);
  
  // Save PDF
  const cleanName = job.musteriAdi ? tr(job.musteriAdi.replace(/\s+/g, '_').toLowerCase()) : 'boyahane_is';
  const filename = `${cleanName}_is_fisi_${job.id.slice(0, 5)}.pdf`;
  doc.save(filename);
}
export default generateJobPDF;
