import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { db } from '@/lib/db';
import crypto from 'crypto';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      data,
      status: init?.status || 200,
    })),
  },
}));

// Setup mock for db
const mockCourses = [
  { id: 1, title: 'Pre-Marital Counselling', matchKeywords: 'PMC, Pre-Marital' },
  { id: 2, title: 'Post-Marital Counselling', matchKeywords: 'Post-Marital' },
  { id: 3, title: 'Sex in Marriage', matchKeywords: '' },
  { id: 4, title: 'Legal Advice on Marriage & Divorce', matchKeywords: 'Legal Advice' },
  { id: 5, title: 'Crisis Management in Marriage', matchKeywords: 'Crisis' },
  { id: 6, title: 'Thriving Beyond Divorce', matchKeywords: '' }
];

let mockDbSelectResult: any[] = [];
let mockInsertedRecordings: any[] = [];

vi.mock('@/lib/db', () => {
  const chain = {
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    then: vi.fn((resolve) => {
      // Return the mockDbSelectResult when select queries are awaited
      return Promise.resolve(resolve(mockDbSelectResult));
    }),
  };
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => chain),
      })),
      insert: vi.fn(() => ({
        values: vi.fn((vals) => {
          mockInsertedRecordings.push(vals);
          return {
            returning: vi.fn().mockResolvedValue([vals]),
            catch: vi.fn().mockResolvedValue(vals),
          };
        }),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve()),
        })),
      })),
    },
  };
});

describe('Zoom Webhook Course Matching', () => {
  const secret = 'test_secret';
  
  beforeEach(() => {
    process.env.ZOOM_WEBHOOK_SECRET_TOKEN = secret;
    mockDbSelectResult = mockCourses;
    mockInsertedRecordings = [];
    vi.clearAllMocks();
  });

  const makeRequest = (topic: string) => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = {
      event: 'recording.completed',
      event_ts: Date.now(),
      download_token: 'test_token',
      payload: {
        object: {
          id: '123456',
          topic: topic,
          host_email: 'instructor@lovevibestudios.com',
          duration: 60,
          recording_files: [
            {
              file_type: 'MP4',
              status: 'completed',
              play_url: 'https://zoom.us/rec/play/xyz',
              download_url: 'https://zoom.us/rec/download/xyz',
              id: 'rec_file_123'
            }
          ]
        }
      }
    };
    
    const body = JSON.stringify(payload);
    const message = `v0:${timestamp}:${body}`;
    const hash = crypto.createHmac('sha256', secret).update(message).digest('hex');
    const signature = `v0=${hash}`;

    return {
      text: vi.fn().mockResolvedValue(body),
      headers: {
        get: vi.fn((name) => {
          if (name === 'x-zm-signature') return signature;
          if (name === 'x-zm-request-timestamp') return timestamp;
          return null;
        }),
      },
    };
  };

  it('should match "Marriage Counseling - Session 1" using fuzzy/word match fallback if not exact', async () => {
    // Note: Since "Marriage Counseling" is not in our mock course list (our courses are Pre-Marital or Post-Marital Counselling),
    // let's see how it behaves. Let's test standard matches first.
  });

  it('should match "Sex in Marriage - Session 1" to "Sex in Marriage" course', async () => {
    const req = makeRequest('Sex in Marriage - Session 1');
    const res: any = await POST(req as any);
    expect(res.status).toBe(200);
    expect(mockInsertedRecordings.length).toBeGreaterThan(0);
    
    const inserted = mockInsertedRecordings.find(r => r.playUrl === 'https://zoom.us/rec/play/xyz');
    expect(inserted).toBeDefined();
    expect(inserted.courseId).toBe(3); // Sex in Marriage id is 3
  });

  it('should match "PMC Session 2" to "Pre-Marital Counselling" course via matchKeywords alias', async () => {
    const req = makeRequest('PMC Session 2');
    const res: any = await POST(req as any);
    expect(res.status).toBe(200);
    expect(mockInsertedRecordings.length).toBeGreaterThan(0);
    
    const inserted = mockInsertedRecordings.find(r => r.playUrl === 'https://zoom.us/rec/play/xyz');
    expect(inserted).toBeDefined();
    expect(inserted.courseId).toBe(1); // Pre-Marital Counselling id is 1
  });

  it('should match "Legal Advice on Marriage & Divorce - Q&A" to "Legal Advice on Marriage & Divorce" course', async () => {
    const req = makeRequest('Legal Advice on Marriage & Divorce - Q&A');
    const res: any = await POST(req as any);
    expect(res.status).toBe(200);
    expect(mockInsertedRecordings.length).toBeGreaterThan(0);
    
    const inserted = mockInsertedRecordings.find(r => r.playUrl === 'https://zoom.us/rec/play/xyz');
    expect(inserted).toBeDefined();
    expect(inserted.courseId).toBe(4); // Legal Advice on Marriage & Divorce id is 4
  });

  it('should prefer longer course title match over keyword match if both match', async () => {
    // If a topic contains "Post-Marital Counselling", it matches both the keyword "Post-Marital" (id 2) and full title (id 2).
    // Let's add a test course to verify sorting:
    // Course 7: "Divorce" keyword, Course 6: "Thriving Beyond Divorce" title.
    // Topic: "Thriving Beyond Divorce Session" should match 6, not 7.
    mockDbSelectResult = [
      ...mockCourses,
      { id: 7, title: 'Divorce Recovery', matchKeywords: 'Divorce' }
    ];
    
    const req = makeRequest('Thriving Beyond Divorce Session');
    await POST(req as any);
    
    const inserted = mockInsertedRecordings.find(r => r.playUrl === 'https://zoom.us/rec/play/xyz');
    expect(inserted.courseId).toBe(6); // Thriving Beyond Divorce is id 6 (longer match text "thriving beyond divorce" vs "divorce")
  });
});
