import { env } from '../../config/env';
import { ShiftType } from '../../models/StaffSchedule';

export interface GeminiOptimizationInput {
  geminiApiKey?: string;
  branch: {
    _id: string;
    name: string;
    code: string;
  };
  period: {
    startDate: string;
    endDate: string;
    daysCount: number;
    weekDates: string[]; // YYYY-MM-DD
  };
  staffList: Array<{
    sid: string;
    name: string;
    email: string;
    username: string;
  }>;
  staffAvailabilities: Array<{
    staffId: string;
    staffName: string;
    rawMessage: string;
    summary: string;
  }>;
  existingSchedules: Array<{
    staffId: string;
    shiftDate: string;
    shiftType: ShiftType;
  }>;
  slotDemands: Array<{
    date: string;
    dayOfWeek: string;
    shiftType: 'Morning' | 'Afternoon' | 'Evening';
    demandScore: number;
    requiredStaffCount: number;
    existingStaffCount: number;
    deficit: number;
  }>;
}

export interface GeminiShiftRecommendation {
  staffId: string;
  staffName: string;
  staffEmail: string;
  shiftDate: string;
  shiftType: 'Morning' | 'Afternoon' | 'Evening';
  demandScore: number;
  confidenceScore: number;
  reason: string;
  isConsecutive?: boolean;
  isReluctant13?: boolean;
  isMatchRegistration?: boolean;
}

export interface GeminiOptimizationResult {
  engine: 'Google Gemini' | 'Heuristic Solver';
  modelUsed?: string;
  recommendations: GeminiShiftRecommendation[];
  aiOverview: string;
}

/**
 * Call Google Gemini API to optimize staff shift scheduling
 */
export const runGeminiShiftOptimization = async (
  input: GeminiOptimizationInput
): Promise<GeminiOptimizationResult | null> => {
  const apiKey = (input.geminiApiKey || env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return null; // Fall back to local solver if no key
  }

  const prompt = `
Bạn là chuyên gia AI điều phối nhân sự hàng đầu của hệ thống cho thuê xe máy MOTORENT tại Đà Nẵng.
Nhiệm vụ của bạn là xếp lịch trực phân ca tối ưu nhất cho chi nhánh: ${input.branch.name} (${input.branch.code}) trong tuần từ ${input.period.startDate} đến ${input.period.endDate}.

QUY TẮC NGHIỆP VỤ BẮT BUỘC:
1. Mỗi ngày có đúng 3 ca làm việc:
   - Ca 1: Sáng (Morning) 07:00 - 12:00
   - Ca 2: Chiều (Afternoon) 12:00 - 17:00
   - Ca 3: Tối (Evening) 17:00 - 22:00
2. TÔN TRỌNG NGUYỆN VỌNG & LỊCH ĐĂNG KÝ CỦA NHÂN VIÊN:
   - Nhân viên gửi tin nhắn đăng ký (ví dụ: "t2 2 3, t3 1 3, t4 1 2, t5 bận...").
   - Ca nhân viên đăng ký "có thể làm" -> Ưu tiên cao nhất.
   - Ca nhân viên báo "bận" / "off" -> TUYỆT ĐỐI KHÔNG xếp (trừ khi hoàn toàn không còn ai khác).
3. NGUYÊN TẮC CA LIÊN TIẾP VS CA CÁCH 1 CA (CỰC KỲ QUAN TRỌNG):
   - Tối đa 2 ca/ngày cho 1 nhân sự để tránh kiệt sức.
   - NẾU 1 nhân viên làm 2 ca trong 1 ngày: BẮT BUỘC ƯU TIÊN XẾP 2 CA LIÊN TIẾP:
     * Ca 1 & Ca 2 (Sáng & Chiều)
     * Hoặc Ca 2 & Ca 3 (Chiều & Tối)
   - Những ca làm cách 1 ca như CA 1 & CA 3 (Sáng & Tối, nghỉ Chiều) là CA GÃY PHI LÝ, gây mệt mỏi và bất tiện cho nhân viên. PHẢI TRÁNH TỐI ĐA, VÀ NẾU KHÔNG CÒN LỰA CHỌN NÀO KHÁC THÌ MỚI MIỄN CƯỠNG CHỌN CA 1 & 3.
4. Chống Clopening: Không xếp Ca 3 (Tối) hôm trước rồi lại Ca 1 (Sáng) hôm sau cho cùng 1 người.
5. Cân bằng tải công bằng: Phân bổ số ca đồng đều giữa các nhân viên trong chi nhánh.

DỮ LIỆU ĐẦU VÀO:
- Danh sách nhân viên trong chi nhánh:
${JSON.stringify(input.staffList, null, 2)}

- Lịch đăng ký rảnh/bận của nhân viên:
${JSON.stringify(input.staffAvailabilities, null, 2)}

- Ca trực đã có sẵn (không được xếp trùng):
${JSON.stringify(input.existingSchedules, null, 2)}

- Nhu cầu nhân sự từng ca (các ca còn thiếu nhân sự - deficit > 0):
${JSON.stringify(
  input.slotDemands.filter((s) => s.deficit > 0),
  null,
  2
)}

YÊU CẦU ĐẦU RA:
Trả về DUY NHẤT một JSON hợp lệ (không kèm markdown \`\`\`json thừa), tuân thủ định dạng sau:
{
  "aiOverview": "Đánh giá tổng quan về phương án phân ca tối ưu của Gemini...",
  "recommendations": [
    {
      "staffId": "<ID nhân viên được chọn>",
      "shiftDate": "YYYY-MM-DD",
      "shiftType": "Morning" | "Afternoon" | "Evening",
      "demandScore": 1.5,
      "confidenceScore": 95,
      "reason": "Lý do chi tiết tiếng Việt (nêu rõ khớp lịch đăng ký, ca liên tiếp 1-2 hay miễn cưỡng 1-3...)",
      "isConsecutive": true | false,
      "isReluctant13": true | false,
      "isMatchRegistration": true | false
    }
  ]
}
`;

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        lastError = new Error(`Gemini API ${model} failed (${response.status}): ${errBody}`);
        continue;
      }

      const resJson = (await response.json()) as any;
      const textContent =
        resJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!textContent) {
        continue;
      }

      // Clean possible markdown code fences if any
      const cleaned = textContent.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && Array.isArray(parsed.recommendations)) {
        const staffMap = new Map(input.staffList.map((s) => [s.sid, s]));

        const sanitizedRecs: GeminiShiftRecommendation[] = [];
        for (const rec of parsed.recommendations) {
          const staff = staffMap.get(rec.staffId);
          if (staff && ['Morning', 'Afternoon', 'Evening'].includes(rec.shiftType)) {
            sanitizedRecs.push({
              staffId: staff.sid,
              staffName: staff.name,
              staffEmail: staff.email,
              shiftDate: rec.shiftDate,
              shiftType: rec.shiftType,
              demandScore: Number(rec.demandScore) || 1.2,
              confidenceScore: Math.min(99, Math.max(75, Number(rec.confidenceScore) || 92)),
              reason: rec.reason || `Gemini tối ưu ca trực cho ${staff.name}`,
              isConsecutive: Boolean(rec.isConsecutive),
              isReluctant13: Boolean(rec.isReluctant13),
              isMatchRegistration: Boolean(rec.isMatchRegistration),
            });
          }
        }

        return {
          engine: 'Google Gemini',
          modelUsed: model,
          recommendations: sanitizedRecs,
          aiOverview:
            parsed.aiOverview ||
            `Google Gemini (${model}) đã tối ưu ${sanitizedRecs.length} ca trực, đảm bảo ưu tiên ca liên tiếp và khớp lịch đăng ký.`,
        };
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) {
    console.warn('[GeminiShiftService] Fallback to heuristic solver. Error:', lastError.message || lastError);
  }
  return null;
};
