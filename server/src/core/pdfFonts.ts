import fs from 'fs';
import path from 'path';

interface PdfFontRegistrar {
  registerFont(name: string, src: string): unknown;
}

export interface UnicodePdfFonts {
  regular: string;
  bold: string;
}

const fontCandidates = (): { regular: string[]; bold: string[] } => {
  if (process.platform === 'win32') {
    return {
      regular: ['C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/calibri.ttf'],
      bold: ['C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/calibrib.ttf'],
    };
  }

  if (process.platform === 'darwin') {
    return {
      regular: [
        '/System/Library/Fonts/Supplemental/Arial.ttf',
        '/Library/Fonts/Arial.ttf',
        '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
      ],
      bold: ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/Library/Fonts/Arial Bold.ttf'],
    };
  }

  return {
    regular: [
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
      '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
    ],
    bold: [
      '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
      '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf',
      '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
    ],
  };
};

const firstExistingFont = (configured: string | undefined, candidates: string[], label: string): string => {
  const paths = configured ? [configured, ...candidates] : candidates;
  const fontPath = paths.find((candidate) => fs.existsSync(candidate));
  if (!fontPath) {
    throw new Error(
      `Không tìm thấy font Unicode để xuất PDF (${label}). Cấu hình MOTORENT_PDF_FONT_${label.toUpperCase()}_PATH hoặc cài Arial/DejaVu Sans.`
    );
  }
  return path.resolve(fontPath);
};

export const registerUnicodePdfFonts = (doc: PdfFontRegistrar): UnicodePdfFonts => {
  const defaults = fontCandidates();
  const regular = firstExistingFont(
    process.env.MOTORENT_PDF_FONT_REGULAR_PATH,
    defaults.regular,
    'regular'
  );
  const bold = firstExistingFont(process.env.MOTORENT_PDF_FONT_BOLD_PATH, defaults.bold, 'bold');

  doc.registerFont('MotorentUnicodeRegular', regular);
  doc.registerFont('MotorentUnicodeBold', bold);
  return { regular: 'MotorentUnicodeRegular', bold: 'MotorentUnicodeBold' };
};
