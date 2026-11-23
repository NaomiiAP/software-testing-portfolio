/**
 * E-ticket PDF in the layout of an Indian Railways "Electronic Reservation Slip"
 * (ERS): journey block, PNR / train / class / quota grid, passenger table with
 * booking and current status, fare and payment details, important instructions
 * and a QR code. Branded RailReserve and marked as a demonstration ticket.
 *
 * The core PDF fonts have no rupee glyph, so amounts are printed as "Rs.".
 */
import { GState, jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { getStation } from '../data/stations';
import { formatDuration, getJourney, getTrain } from '../data/trains';
import { CLASS_INFO, CLASS_ORDER, CLERKAGE_PER_PASSENGER, GENDER_LABEL, QUOTA_LABEL } from '../lib/constants';
import { addDays, formatJourneyDate } from '../lib/dates';
import { CONCESSIONS } from '../lib/fare';
import { REFUND_RULE_TEXT } from '../lib/refund';
import { berthLabel, type Booking } from '../lib/reservation';
import { STATUS_LABEL, type TicketStatus } from '../lib/ticketState';

type RGB = [number, number, number];
const NAVY: RGB = [10, 22, 51];
const NAVY_SOFT: RGB = [199, 211, 245];
const SAFFRON: RGB = [255, 122, 26];
const INK: RGB = [11, 18, 32];
const MUTED: RGB = [91, 103, 128];
const LINE: RGB = [226, 231, 240];
const MIST: RGB = [244, 246, 250];
const STATUS_RGB: Record<TicketStatus, RGB> = { CNF: [0, 140, 119], RAC: [217, 138, 11], WL: [204, 47, 53], CAN: [100, 116, 139] };

const PAGE_W = 210;
const M = 14; // inner margin
const rs = (n: number) => `Rs. ${n.toLocaleString('en-IN')}`;
const longDate = (iso: string) => formatJourneyDate(iso).replace(/,/g, '');

function drawLogo(doc: jsPDF, x: number, y: number) {
  doc.setFillColor(...SAFFRON);
  doc.roundedRect(x, y, 14, 14, 3, 3, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x + 3.6, y + 2.4, 6.8, 7.2, 1.6, 1.6, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(x + 4.6, y + 3.6, 2, 2, 'F');
  doc.rect(x + 7.4, y + 3.6, 2, 2, 'F');
  doc.circle(x + 5.2, y + 8, 0.55, 'F');
  doc.circle(x + 8.8, y + 8, 0.55, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.7);
  doc.line(x + 4.6, y + 10.6, x + 3.6, y + 12.2);
  doc.line(x + 9.4, y + 10.6, x + 10.4, y + 12.2);
}

function pill(doc: jsPDF, rightX: number, y: number, text: string, color: RGB) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const w = doc.getTextWidth(text) + 7;
  doc.setFillColor(...color);
  doc.roundedRect(rightX - w, y, w, 5.6, 2.8, 2.8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(text, rightX - w / 2, y + 3.9, { align: 'center' });
}

function label(doc: jsPDF, text: string, x: number, y: number) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.6);
  doc.setTextColor(...MUTED);
  doc.text(text.toUpperCase(), x, y);
}

function value(doc: jsPDF, text: string, x: number, y: number, size = 9.5, font: 'helvetica' | 'courier' = 'helvetica') {
  doc.setFont(font, 'bold');
  doc.setFontSize(size);
  doc.setTextColor(...INK);
  doc.text(text, x, y);
}

export async function downloadTicketPdf(b: Booking): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const contentW = PAGE_W - 2 * M;
  const journey = getJourney(getTrain(b.trainNumber)!, b.from, b.to);
  const bookedStatus = b.history[0]?.status ?? b.status;
  const changed = b.history.some((h) => h.event !== 'BOOKED' && h.event !== 'CHART_PREPARED');
  const arrival = addDays(b.date, b.arrivalDayOffset);
  const qr = await QRCode.toDataURL(
    `RailReserve ERS|PNR ${b.pnr}|${b.trainNumber}|${b.from}-${b.to}|${b.date} ${b.departureTime}|${b.travelClass}/${b.quota}|${b.passengers.length} PAX|${b.status}`,
    { margin: 0, width: 360, errorCorrectionLevel: 'M', color: { dark: '#0A1633', light: '#FFFFFF' } },
  );

  // ------------------------------------------------------------------ frame + header band
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.roundedRect(7, 7, PAGE_W - 14, 283, 3, 3);
  doc.setFillColor(...NAVY);
  doc.roundedRect(7, 7, PAGE_W - 14, 31, 3, 3, 'F');
  doc.rect(7, 22, PAGE_W - 14, 16, 'F');
  drawLogo(doc, M, 12.5);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RailReserve', M + 18, 19.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY_SOFT);
  doc.text('Electronic Reservation Slip (ERS) - Normal User', M + 18, 25);
  doc.text('Demonstration ticket - not valid for travel', M + 18, 29.5);
  doc.setFontSize(7.5);
  doc.text('PNR', PAGE_W - M, 15, { align: 'right' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(21);
  doc.setTextColor(255, 255, 255);
  doc.text(b.pnr, PAGE_W - M, 23.5, { align: 'right' });
  pill(doc, PAGE_W - M, 27.5, STATUS_LABEL[b.status].toUpperCase(), STATUS_RGB[b.status]);
  doc.setFillColor(...SAFFRON);
  doc.rect(7, 38, PAGE_W - 14, 1.4, 'F');

  // ------------------------------------------------------------------ journey block
  let y = 49;
  const colW = contentW / 3;
  const from = getStation(b.from);
  const to = getStation(b.to);
  const blocks = [
    { title: 'Booked from', name: from?.name ?? b.from, code: b.from, line: `Start date* ${longDate(b.date)}` },
    { title: 'Boarding at', name: from?.name ?? b.from, code: b.from, line: `Departure* ${b.departureTime}  ${longDate(b.date)}` },
    { title: 'To', name: to?.name ?? b.to, code: b.to, line: `Arrival* ${b.arrivalTime}  ${longDate(arrival)}` },
  ];
  blocks.forEach((blk, i) => {
    const x = M + i * colW;
    label(doc, blk.title, x, y);
    value(doc, blk.name, x, y + 6, 11.5);
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...NAVY);
    doc.text(`(${blk.code})`, x, y + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(blk.line, x, y + 16);
  });

  // route strip
  y += 22;
  doc.setDrawColor(...NAVY_SOFT);
  doc.setLineWidth(0.6);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(M + 3, y, PAGE_W - M - 3, y);
  doc.setLineDashPattern([], 0);
  doc.setFillColor(...NAVY);
  doc.circle(M + 2, y, 1.4, 'F');
  doc.circle(PAGE_W - M - 2, y, 1.4, 'F');
  const routeText = `${journey ? formatDuration(journey.durationMinutes) : ''}  |  ${journey?.distanceKm ?? ''} km  |  ${b.trainNumber} ${b.trainName}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const rtW = doc.getTextWidth(routeText) + 8;
  doc.setFillColor(255, 255, 255);
  doc.rect(PAGE_W / 2 - rtW / 2, y - 3, rtW, 6, 'F');
  doc.setTextColor(...NAVY);
  doc.text(routeText, PAGE_W / 2, y + 1.1, { align: 'center' });

  // ------------------------------------------------------------------ details grid + QR
  y += 8;
  const qrSize = 34;
  const gridW = contentW - qrSize - 5;
  const cellW = gridW / 4;
  const cells: [string, string][] = [
    ['PNR', b.pnr],
    ['Train No. / Name', `${b.trainNumber} / ${b.trainName}`],
    ['Class', CLASS_INFO[b.travelClass].label],
    ['Quota', `${QUOTA_LABEL[b.quota]} (${b.quota})`],
    ['Distance', `${journey?.distanceKm ?? '-'} km`],
    ['Booking date', new Date(b.bookedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })],
    ['Chart status', b.chartPrepared ? 'Chart prepared' : 'Chart not prepared'],
    ['Transaction ID', b.payment.reference],
  ];
  cells.forEach(([k, v], i) => {
    const cx = M + (i % 4) * cellW;
    const cy = y + Math.floor(i / 4) * 16;
    doc.setFillColor(...MIST);
    doc.roundedRect(cx, cy, cellW - 2, 14, 1.8, 1.8, 'F');
    label(doc, k, cx + 2.5, cy + 4.6);
    doc.setFont(k === 'PNR' || k === 'Transaction ID' ? 'courier' : 'helvetica', 'bold');
    doc.setFontSize(k === 'Train No. / Name' || k === 'Booking date' ? 7.4 : 8.6);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(v, cellW - 6) as string[];
    doc.text(lines.slice(0, 2), cx + 2.5, cy + 9.2);
  });
  doc.addImage(qr, 'PNG', PAGE_W - M - qrSize, y - 1, qrSize, qrSize);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text('Scan to verify', PAGE_W - M - qrSize / 2, y + qrSize + 2.5, { align: 'center' });

  // ------------------------------------------------------------------ passengers
  y += 40;
  value(doc, 'Passenger details', M, y, 10.5);
  const statusText = (slot: number | null) => {
    const berth = berthLabel(b.status, b.travelClass, slot);
    if (b.status === 'CAN') return 'CAN';
    if (b.status === 'CNF') return `CNF/${berth}`;
    return berth; // "RAC 1", "WL 3"
  };
  autoTable(doc, {
    startY: y + 3,
    margin: { left: M, right: M },
    head: [['#', 'Name', 'Age', 'Gender', 'Concession', 'Booking status', 'Current status', 'Fare']],
    body: b.passengers.map((p, i) => [
      String(i + 1),
      p.name,
      String(p.age),
      GENDER_LABEL[p.gender],
      CONCESSIONS[p.concession].label,
      changed ? bookedStatus : statusText(p.slot),
      statusText(p.slot),
      rs(p.fare),
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.2, cellPadding: 2.2, lineColor: LINE, lineWidth: 0.2, textColor: INK },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7.6 },
    alternateRowStyles: { fillColor: MIST },
    columnStyles: { 0: { cellWidth: 8 }, 2: { cellWidth: 11 }, 6: { fontStyle: 'bold' }, 7: { halign: 'right', cellWidth: 22 } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // ------------------------------------------------------------------ payment + fare boxes
  const boxW = contentW / 2 - 2;
  const boxH = b.cancellation ? 36 : 29;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, boxW, boxH, 2, 2);
  doc.roundedRect(M + boxW + 4, y, boxW, boxH, 2, 2);
  value(doc, 'Payment details', M + 4, y + 6, 9);
  value(doc, 'Fare details', M + boxW + 8, y + 6, 9);
  const row = (x: number, ry: number, k: string, v: string, w: number, bold = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(k, x, ry);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...INK);
    doc.text(v, x + w - 8, ry, { align: 'right' });
  };
  row(M + 4, y + 12.5, 'Payment mode', b.payment.method === 'UPI' ? 'UPI' : 'Debit / credit card', boxW);
  row(M + 4, y + 17.5, 'Transaction ID', b.payment.reference, boxW);
  row(M + 4, y + 22.5, 'Contact', `${b.contact.mobile}  ${b.contact.email}`, boxW);
  const fx = M + boxW + 8;
  row(fx, y + 12.5, 'Ticket fare', rs(b.fare.subtotal), boxW);
  row(fx, y + 17.5, 'Convenience fee', rs(b.fare.convenienceFee), boxW);
  row(fx, y + 23.5, 'Total fare (all inclusive)', rs(b.fare.total), boxW, true);
  if (b.cancellation) {
    const c = b.cancellation;
    row(M + 4, y + 29.5, 'Cancelled on', new Date(c.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), boxW);
    row(fx, y + 29.5, `Refund (deduction ${rs(c.deduction)})`, rs(c.refund), boxW, true);
  }
  y += boxH + 6;

  // ------------------------------------------------------------------ notices
  const notice = (text: string, fill: RGB, color: RGB) => {
    const lines = doc.splitTextToSize(text, contentW - 8) as string[];
    const h = lines.length * 3.8 + 4;
    doc.setFillColor(...fill);
    doc.roundedRect(M, y, contentW, h, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(...color);
    doc.text(lines, M + 4, y + 5);
    y += h + 4;
  };
  if (b.status === 'WL') {
    notice('Waitlisted e-tickets are not valid for travel. If the ticket is still waitlisted when the chart is prepared (4 hours before departure) it is cancelled automatically and refunded minus clerkage.', [255, 241, 242], STATUS_RGB.WL);
  }
  if (b.cancellation) {
    notice(
      `Ticket cancelled. ${b.cancellation.rule === 'WL_AUTO_CANCEL' ? 'Waitlisted ticket cancelled automatically at chart preparation.' : REFUND_RULE_TEXT[b.cancellation.rule]}. Refund of ${rs(b.cancellation.refund)} is credited to the original payment method.`,
      [241, 245, 249],
      STATUS_RGB.CAN,
    );
  }

  // ------------------------------------------------------------------ instructions
  value(doc, 'Important instructions', M, y + 2, 9.5);
  y += 6;
  const flat = CLASS_ORDER.map((c) => `${c} Rs. ${CLASS_INFO[c].cancellationCharge}`).join(', ');
  const notes = [
    'Carry an original photo identity card (Aadhaar, PAN card, passport, driving licence or voter ID) during the journey. This slip together with the ID card is the travel authority.',
    'The reservation chart is prepared 4 hours before the scheduled departure. Check the latest PNR status before leaving for the station.',
    `Cancellation of confirmed tickets: more than 48 h before departure - flat charge per passenger (${flat}); 12-48 h - 25% of fare; 4-12 h - 50% of fare; within 4 h - no refund. Confirmed Tatkal tickets are non-refundable.`,
    `RAC and waitlisted tickets can be cancelled up to 30 minutes before departure with a clerkage of Rs. ${CLERKAGE_PER_PASSENGER} per passenger. The convenience fee is not refundable.`,
    'Children below 5 years travel free without a berth. Senior citizen concessions (women 58+, men and transgender 60+) are not available in the Tatkal quota.',
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.6);
  notes.forEach((n, i) => {
    const lines = doc.splitTextToSize(n, contentW - 7) as string[];
    if (y + lines.length * 3.6 > 272) {
      doc.addPage();
      y = 20;
    }
    doc.setTextColor(...SAFFRON);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}.`, M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    doc.text(lines, M + 5, y);
    y += lines.length * 3.6 + 1.8;
  });

  // ------------------------------------------------------------------ cancelled watermark
  if (b.status === 'CAN') {
    doc.setPage(1);
    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.1 }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(84);
    doc.setTextColor(...STATUS_RGB.WL);
    doc.text('CANCELLED', 38, 205, { angle: 30 });
    doc.restoreGraphicsState();
  }

  // ------------------------------------------------------------------ footer (every page)
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.line(M, 278, PAGE_W - M, 278);
    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(`Generated ${new Date().toLocaleString('en-IN')}  |  support@railreserve.test  |  Helpline 139 (sample)`, M, 283);
    doc.text(`Page ${p} of ${pages}`, PAGE_W - M, 283, { align: 'right' });
    doc.text('Generated by RailReserve, a software testing demonstration project. Not a valid travel document; not affiliated with Indian Railways or IRCTC.', M, 287);
  }

  doc.save(`RailReserve-${b.pnr}.pdf`);
}
