/**
 * Scrape UNB Saint John course sections from self-service API (time, room, building, enrollment).
 * Outputs one row per section in the shape expected by seed-courses.ts.
 *
 * Auth is short-lived: pass token and cookie on the command line when you run (no env or file).
 * Log in at https://selfservice.unb.ca, open DevTools → Network, trigger any request (e.g. click
 * Courses, or use the GetEffectiveUserRestrictions request). Copy from Request Headers:
 *   __requestverificationtoken  → --token "…"
 *   cookie                      → --cookie "…"
 *
 * Usage:
 *   npx ts-node scripts/scrape-courses.ts --token "YOUR_TOKEN" --cookie "YOUR_COOKIE" [output.json]
 *   npm run scrape-courses -- --token "..." --cookie "..."
 *
 * Optional: --locations "SJ" (default), --delay 400 (ms between pages), output path last.
 *
 * Output: array of { classCode, startTime, endTime, name, term?, building?, room?, sectionCode?, enrolled?, capacity? }
 * (seed-courses uses classCode, startTime, endTime, name, term, building, room; extra fields kept for reference.)
 */

const API_URL = "https://selfservice.unb.ca/Student/Student/Courses/PostSearchCriteria";
const DEFAULT_OUTPUT = "data/scraped-courses.json";
const PER_PAGE = 30;
const DEFAULT_DELAY_MS = 400;

// Fallback auth (short-lived; replace from DevTools when expired, or pass --token/--cookie)
const DEFAULT_TOKEN = "CfDJ8B0GSlrVWN9Dn-qVRI-h8-2cLbIR521OBhnEaSEyflIYi0vFtGDhS0_ZS80XZ4tCDyxIfSrKoSnD_NTNRcjU4PXQJHeHoVIL6C0N0V0kaRAAkpITAgMY-Ykea6LjFi9fiN4VMVKqGifWgFPvzutLOHpuhE8F6TTk03sW52tpLusUQdaOMy6KqK3vEyM94yTntg";
const DEFAULT_COOKIE =
  "_scid=tjZfoA50ljq8s61FTneFiatLGy8KPkAG; _tt_enable_cookie=1; _ttp=01JZZRRT1G3VN078VGCQXTZ5N3_.tt.1; _ga_5M2EL2XPJ7=GS2.1.s1755014083$o1$g1$t1755014273$j27$l0$h0; _ga_LNQ9882X56=GS2.1.s1756411679$o1$g1$t1756411697$j42$l0$h0; _ga_1Y8HQLWV9F=GS2.1.s1756411708$o1$g0$t1756411708$j60$l0$h0; _ga_EH49K9L832=GS2.1.s1756411704$o2$g1$t1756411727$j37$l0$h0; _ga_G6V4FSGS17=GS2.1.s1756411726$o1$g0$t1756411733$j53$l0$h0; _ga_GDSPR8016V=GS2.1.s1756414509$o4$g0$t1756414509$j60$l0$h0; _ga_LB8RMQXG16=GS2.1.s1756414509$o3$g0$t1756414509$j60$l0$h0; _scid_r=sLZfoA50ljq8s61FTneFiatLGy8KPkAGCW-S2A; _ga_DRN9S4C90Y=GS2.1.s1756414509$o4$g1$t1756415063$j6$l0$h0; _ga_BDPZQLK1NJ=GS2.1.s1756414942$o1$g1$t1756415063$j6$l0$h0; _ga_TT9YM46Z6L=GS2.1.s1768015992$o3$g1$t1768016208$j42$l0$h0; _gcl_au=1.1.1568207323.1768841616; _ga_SFSGHCH5KX=GS2.1.s1770504945$o2$g0$t1770504945$j60$l0$h0; _ga_GREC9955KT=GS2.1.s1770504945$o2$g0$t1770504945$j60$l0$h0; __utmc=217725129; studentselfservice_production_AuthMethod=SAML; _clck=1ft40ca%5E2%5Eg41%5E0%5E2066; ttcsid_CJMFHSBC77U2JVNG8520=1772516651247::pysZSt-oqUHGVsL1X5Jf.8.1772516651461.0; ttcsid=1772516650384::KKmNrlg69d30-tg_itgz.8.1772516685544.0; ttcsid_D1IOGDJC77U2C2OQ1M7G=1772516650383::JCxTHT9SzpyoJg-bOmrV.8.1772516685546.1; _ga_R5E6BD0GFL=GS2.1.s1772519951$o6$g0$t1772519951$j60$l0$h0; _ga_ZSH47Z6CY4=GS2.1.s1772519951$o10$g0$t1772519951$j60$l0$h0; _ga_5XQYBPP5MZ=GS2.1.s1772561091$o83$g0$t1772561091$j60$l0$h0; _ga=GA1.1.351082445.1752339080; _ga_BE6MD70JEL=GS2.1.s1772561098$o88$g0$t1772561098$j60$l0$h0; studentselfservice_production_sfid=C02795K61392; studentselfservice_production_Sso=CfDJ8B0GSlrVWN9Dn%2BqVRI%2Bh8%2B34gZDHW5bonvxRSDo1fangZIYjPurY4m50StIKMEvMaDgtx5oWhvb31mM0EDiHSHsf01hHC%2BEH0lEsk2Ctr4cwyR47FOTsPwLS0GGeM7BrH0Duqw5ISHiyCZjYcpLKo3fJdKmIQrIWO34oJn7sn9mcxI9BfNLBsgzm3KP9UHM4IlxqrQZUOdR5eRE2h2Lb9QnPBx1BYwne1ELVlMlC1aAHMPObbhRy7brfO2h8NhxvlM8e2dDQulmsdwfX2t3O4sPvJtY3Qyj%2BcCyP37%2FKa%2FYAXDWFPzxlJQkmnCTKuY6stYZbWcoUwYYHikJmLGCSwD%2FT0NFlC59AgQB1JnIZLHbF; .ColleagueSelfServiceAntiforgery=CfDJ8B0GSlrVWN9Dn-qVRI-h8-3xA02PnkNjXriQ4k9sgkYFS_a-mf2_x8582nVm3vjViqmCKEosfMwVOPYegeF2EEFp9THgmLSZ61t21qV8Ab1mcjx4ZswP59buIzswf0fbnTDaIsnjJ2_rgQv85bSScpk; studentselfservice_production=CfDJ8B0GSlrVWN9Dn-qVRI-h8-3Gri6mWYIDwm4TmyWqhbyJV1a8Srp9yn1NMNqln5orLddaB47DoWMr0DAx7m8vVXKRCr9MM4nOT4XXybUg6eURtUcKhZ32duDQWFD_tT3BMBANJOv2eMIN9-CwyH3GHOjfb8Y9vsYDduKES8sYNSaBobjQkh4Hunqxy7Iu0uMhJvoQl5oBMYjW9rOpuQFORmOdj9ZXId4k4oJbg7EyFtSVeR-AB2QOKb5EWK81D6JTMmLBzkXFK7qpDMoDtF2Iyh7qLfsKAmZIh9B1wOHMEBGJ1lzr6N7UDkJ-iF11eLizMxp14RpFJu4d-q4Z4G-iMTQS696ChQuXMU5UfbyDt2iHlijPJw9_YqqpGAelMStNP08BLvsYIMK-liA6Z9sL-F6A7CNRstEXBqhQiTGgSwEIvyYDGSCFZcwOxiVeJKsqyECo9KZrGBBuSjiaJL9UgX1M-nPbQrkyov5sZgUCkdvQUkcvi7_ttS2HhVP10f2fER4XU5bTX35Y75ThK-Pl1DgYSVbx7OdO9aiwicWdSzx9c61UqZEAQ5YR2vftbWWVMIH6ZsiWREvmMfukJPxWwIeevsCvhi02O_E66MwETVkJ13J1zN8shRpACsP3RRt8NjVMD8TMXi6y3f-9he4i6u9SoaQ2h2s-1Ii-rxBLBH9S8l7vW_bZ1kxadq3Ateq5FOHjOeIGT8nEGlv_p3pnW1hVPXwidwaejfv_rxFavWjdcs4cs5vSxIhbTgX_w0gDeXj0to37Fg-CWW0w2N01HthXgkhosz-EFouh7ET4MIldpXSkmjpfZloluuM5gW73a5hBM0mghF--HcJM-at0lwM_V4LCKi2kGIAQnlTZxuD5H_wLuwwkU6i1iGvy60yL7wWbLvdW58moEvtSKIRyQ4EZFYmrAhVjkj9-amJUooX0TlUPotHR-FpsSuAtBOpNOPKqlQyDGYJ2HBMUei41SOoGiSugurnkNw528Ccvv8S9f61aFTl23H9m-adO3M7UHFsLrYvXyZKVOHtgdtYAxVsHspFPCmdVHLdATue1eikPyPHCK2gkEXzF9-RQxwc15XT1Nv8Dmjf31eMFi0mBMga3rJ_E3rsX4O1iKXoPYUb5eqNv0cHwPoRRlp9fjUbKNzuUfvcakAJubP3QXlrLSfNc7EMDweox4wWPDnDSBN9N-qLK57Na5c-vI5jD8TWVU_9yac7S2-qTgpqoPdlvJH23QNCI949vXFAmn5V4nCwS5BqHqLV_m2YQvXy-OSgmMy-x4W_jseNesOpXWAXn9B-bHqAsNctGkMD2732VOeaqJDtnow4dl3O3SkHpD2SRjnm0iYFDqSitfDKp81jEhlLaD59cjD97FpB5ssMcxCP1AnbA6eXWjpv6zkrgdRe7NBwjMmr--OMt1mFVjBiDEx4qQpujRCB_mj5nLDLH-fbTz3yujMc_4sgTmaScmNA7n_Sef8v7oNxuRKAICudoUqP1cpIN_vLslwoi0_-Rtv7tp4tF58SHdMPXsTGvFDhfng; __utma=217725129.351082445.1752339080.1772516650.1772680530.9; __utmz=217725129.1772680530.9.9.utmcsr=google|utmccn=(organic)|utmcmd=organic|utmctr=(not%20provided); __utmt=1; __utmb=217725129.3.10.1772680530; studentselfservice_production_ls=CfDJ8B0GSlrVWN9Dn-qVRI-h8-0ejAafLZfE8A57-hfhHH1eReNSVVYsAR2lzgcBIKTFZWTw4aXTDkVwog1gCmpD8h025HzSyTXHi0lm7KGpATnIxTRk9_gJE_RPMA-HSY6EcAE0Nv7arTiTYBkvrJ4Adc8; studentselfservice_production_0=CfDJ8B0GSlrVWN9Dn-qVRI-h8-0vkEv8F1kWhqZvtOCw5ITM9sqS6OoAKVr4yYvoWuXnteoUxCh__XLgYPxtmSvnRdau_Yb__5uPku88TnPUc-FnZeLGpXbmTQCaX4Idgb8ePCowH5Gd49rI-c_XCYdSjbun7z_TEolQPGmwY4cwguAVasfl7_1W4Gyiqx1KkQdC_FkbURmMxxCROjYBgQ6thPUFwe_cYCZvio6oJNn2zXmMQYBjhQgRMB5b5HuIWxZGDF8M7BVUH2MHuigiaF6h42zKjdmqn4MEZQbSwl2YDsgG5IHsnsiYN7l3QYsCz7ERT7o1YO2IxDd3wxzeJNYGSMTcgTMnQCkNoK75Yuirl3QqJxiyAFOP2fAhAs8MKcqdJMd_RZXXO9M_i0K43V0d0nkhFtfvVQfjo8Qrk3L1QhfB9YqI2yavsUoBtl9vha42RmXfTukVcVc8qMk4V1XHRjBMdAW5MUcQCuNBzE8BUeM2itPTdQAWXzTacqX5RfamoiEGInANEoA2V0YcmfZOr-PnTbvT2BF7qXOVbTMdIadVZrezEHv6y3cY7mzyP0zpsOp5xaZqPWdIFfHfxJzC9HpxBpR6AAogk6jHfu0HAJ1_GE2quoZ7oFGH_6DzF_vkAG7gPceZjNPCXJZ02NdhsbcZ7u_J7tUgKQYJ7fg3Rgrjp8Ny-v0fePKvr8tnxDOUoQ";

// Possible API response shapes (we don't have official docs)
interface UnbCourseRaw {
  SubjectCode?: string;
  Number?: string;
  Title?: string;
  MinimumCredits?: number;
  Description?: string;
  Sections?: UnbSectionRaw[];
  [key: string]: unknown;
}

interface UnbSectionRaw {
  SectionNumber?: string;
  StartTime?: string;
  EndTime?: string;
  MeetingTime?: string;
  Room?: string;
  Building?: string;
  Location?: string;
  Term?: string | UnbTermDetail;
  TermCode?: string;
  Enrolled?: number;
  Capacity?: number;
  SubjectCode?: string;
  Number?: string;
  Title?: string;
  CourseTitle?: string;
  Section?: UnbSectionDetail;
  SectionNameDisplay?: string;
  SectionTitleDisplay?: string;
  FullTitleDisplay?: string;
  CourseName?: string;
  TermId?: string;
  FormattedMeetingTimes?: UnbFormattedMeetingTime[];
  Course?: { SubjectCode?: string; Number?: string; [key: string]: unknown };
  [key: string]: unknown;
}

interface SectionOut {
  classCode: string;
  startTime: string;
  endTime: string;
  name: string | null;
  term: string | null;
  building: string | null;
  room: string | null;
  sectionCode?: string;
  enrolled?: number;
  capacity?: number;
}

/** Real API shape: SectionsRetrieved.TermsAndSections[].Term + Sections[].Section */
interface UnbFormattedMeetingTime {
  StartTime?: string;
  EndTime?: string;
  BuildingDisplay?: string;
  RoomDisplay?: string;
  StartTimeDisplay?: string;
  EndTimeDisplay?: string;
  [key: string]: unknown;
}
interface UnbSectionDetail {
  SectionNameDisplay?: string;
  FullTitleDisplay?: string;
  SectionTitleDisplay?: string;
  CourseName?: string;
  Number?: string;
  CourseId?: string;
  Enrolled?: number;
  Capacity?: number;
  Location?: string;
  TermId?: string;
  FormattedMeetingTimes?: UnbFormattedMeetingTime[];
  Meetings?: { Room?: string; StartTime?: string; EndTime?: string }[];
  [key: string]: unknown;
}
interface UnbTermDetail {
  Code?: string;
  Description?: string;
  [key: string]: unknown;
}
interface UnbTermAndSections {
  Term?: UnbTermDetail;
  Sections?: { Section?: UnbSectionDetail }[];
}
interface UnbSectionsRetrieved {
  TermsAndSections?: UnbTermAndSections[];
}

function parseArgs(): { token: string; cookie: string; locations: string[]; delayMs: number; outputPath: string } {
  const argv = process.argv.slice(2);
  let token = "";
  let cookie = "";
  let locations: string[] = ["SJ"];
  let delayMs = DEFAULT_DELAY_MS;
  let outputPath = DEFAULT_OUTPUT;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--token" && argv[i + 1] !== undefined) {
      token = argv[++i];
    } else if (argv[i] === "--cookie" && argv[i + 1] !== undefined) {
      cookie = argv[++i];
    } else if (argv[i] === "--locations" && argv[i + 1] !== undefined) {
      locations = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    } else if (argv[i] === "--delay" && argv[i + 1] !== undefined) {
      delayMs = Math.max(0, parseInt(argv[++i], 10) || DEFAULT_DELAY_MS);
    } else if (argv[i].endsWith(".json") && !argv[i].startsWith("--")) {
      outputPath = argv[i];
    }
  }

  if (!token) token = DEFAULT_TOKEN;
  if (!cookie) cookie = DEFAULT_COOKIE;
  return { token, cookie, locations, delayMs, outputPath };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Normalize time to HH:mm (24h). Handles "17:30:00", "5:30 PM", "08:30". */
function normalizeTime(s: string | undefined): string {
  if (!s || typeof s !== "string") return "00:00";
  const t = s.trim();
  if (!t) return "00:00";
  // HH:mm:ss (24h)
  const hms = t.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hms) {
    const h = parseInt(hms[1], 10);
    return `${String(h).padStart(2, "0")}:${hms[2]}`;
  }
  // "8:30 AM", "5:30 PM"
  const match = t.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!match) return "00:00";
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = (match[3] || "").toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
}

async function fetchPage(
  pageNumber: number,
  token: string,
  cookie: string,
  locations: string[],
  searchResultsView: string
): Promise<UnbCourseRaw[]> {
  const payload = {
    keyword: null,
    terms: [],
    requirement: null,
    subrequirement: null,
    courseIds: null,
    sectionIds: null,
    requirementText: null,
    subrequirementText: "",
    group: null,
    startTime: null,
    endTime: null,
    openSections: null,
    subjects: [],
    academicLevels: [],
    courseLevels: [],
    synonyms: [],
    courseTypes: [],
    topicCodes: [],
    days: [],
    locations: locations.length ? locations : ["SJ"],
    faculty: [],
    onlineCategories: null,
    keywordComponents: [],
    startDate: null,
    endDate: null,
    startsAtTime: null,
    endsByTime: null,
    pageNumber,
    sortOn: "None",
    sortDirection: "Ascending",
    quantityPerPage: PER_PAGE,
    searchResultsView,
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      accept: "application/json, text/javascript, */*; q=0.01",
      "content-type": "application/json; charset=UTF-8",
      origin: "https://selfservice.unb.ca",
      referer: "https://selfservice.unb.ca/Student/Student/Courses/Search",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "x-requested-with": "XMLHttpRequest",
      __requestverificationtoken: token,
      __isguestuser: "false",
      cookie,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { Courses?: UnbCourseRaw[]; Sections?: UnbSectionRaw[] };
  const courses = data.Courses ?? [];
  return Array.isArray(courses) ? courses : [];
}

/** Fetch with SectionListing view; API may return SectionsRetrieved.TermsAndSections or Courses/Sections */
async function fetchSectionPage(
  pageNumber: number,
  token: string,
  cookie: string,
  locations: string[]
): Promise<{
  courses: UnbCourseRaw[];
  sectionsOnly: UnbSectionRaw[] | null;
  sectionsRetrieved?: UnbSectionsRetrieved;
  _raw?: unknown;
}> {
  const payload = {
    keyword: null,
    terms: [],
    requirement: null,
    subrequirement: null,
    courseIds: null,
    sectionIds: null,
    requirementText: null,
    subrequirementText: "",
    group: null,
    startTime: null,
    endTime: null,
    openSections: null,
    subjects: [],
    academicLevels: [],
    courseLevels: [],
    synonyms: [],
    courseTypes: [],
    topicCodes: [],
    days: [],
    locations: locations.length ? locations : ["SJ"],
    faculty: [],
    onlineCategories: null,
    keywordComponents: [],
    startDate: null,
    endDate: null,
    startsAtTime: null,
    endsByTime: null,
    pageNumber,
    sortOn: "None",
    sortDirection: "Ascending",
    quantityPerPage: PER_PAGE,
    searchResultsView: "SectionListing",
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      accept: "application/json, text/javascript, */*; q=0.01",
      "content-type": "application/json; charset=UTF-8",
      origin: "https://selfservice.unb.ca",
      referer: "https://selfservice.unb.ca/Student/Student/Courses/Search",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "x-requested-with": "XMLHttpRequest",
      __requestverificationtoken: token,
      __isguestuser: "false",
      cookie,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    Courses?: UnbCourseRaw[];
    Sections?: UnbSectionRaw[];
    SectionsRetrieved?: UnbSectionsRetrieved;
  };
  const courses = Array.isArray(data.Courses) ? data.Courses : [];
  const sectionsOnly = Array.isArray(data.Sections) ? data.Sections : null;
  const sectionsRetrieved = data.SectionsRetrieved;
  return { courses, sectionsOnly, sectionsRetrieved, _raw: pageNumber === 1 ? data : undefined };
}

function str(o: unknown): string | null {
  if (o == null) return null;
  const s = String(o).trim();
  return s || null;
}

function toNum(o: unknown): number | undefined {
  if (o == null) return undefined;
  const n = Number(o);
  return Number.isNaN(n) ? undefined : n;
}

/** Flatten courses + sections into one row per section; fallback one row per course with placeholder times. */
function flattenToSections(courses: UnbCourseRaw[]): SectionOut[] {
  const out: SectionOut[] = [];
  for (const c of courses) {
    const subject = (c.SubjectCode ?? "").toString().trim();
    const num = (c.Number ?? "").toString().trim();
    const classCodeBase = subject && num ? `${subject}${num}` : subject || num || "UNKNOWN";
    const name = str(c.Title) ?? null;
    const sections = c.Sections;
    if (Array.isArray(sections) && sections.length > 0) {
      for (const sec of sections) {
        const startTime = normalizeTime(sec.StartTime ?? sec.MeetingTime);
        const endTime = normalizeTime(sec.EndTime);
        const building = str(sec.Building ?? sec.Location) ?? null;
        const room = str(sec.Room) ?? null;
        const term = str(sec.Term ?? sec.TermCode) ?? null;
        const sectionCode = str(sec.SectionNumber) ?? undefined;
        const enrolled = toNum(sec.Enrolled);
        const capacity = toNum(sec.Capacity);
        out.push({
          classCode: sectionCode ? `${classCodeBase}-${sectionCode}` : classCodeBase,
          startTime: startTime !== "00:00" ? startTime : "00:00",
          endTime: endTime !== "00:00" ? endTime : "23:59",
          name,
          term,
          building,
          room,
          sectionCode,
          enrolled,
          capacity,
        });
      }
    } else {
      out.push({
        classCode: classCodeBase,
        startTime: "00:00",
        endTime: "23:59",
        name,
        term: null,
        building: null,
        room: null,
      });
    }
  }
  return out;
}

/** API returns data.Sections where each item IS the section (Term, Course, FormattedMeetingTimes at top level). */
function flattenFlatSections(sections: UnbSectionRaw[]): SectionOut[] {
  const out: SectionOut[] = [];
  for (const item of sections) {
    const termObj = item.Term && typeof item.Term === "object" ? (item.Term as UnbTermDetail) : null;
    const termLabel = termObj
      ? str(termObj.Description) ?? str(termObj.Code) ?? null
      : null;
    const sectionNameDisplay = str(item.SectionNameDisplay);
    const courseName = str(item.CourseName);
    const course = item.Course && typeof item.Course === "object" ? (item.Course as { SubjectCode?: string; Number?: string }) : null;
    const sectionTitle = str(item.SectionTitleDisplay);
    const fullTitle = str(item.FullTitleDisplay);
    const name = sectionTitle ?? fullTitle ?? null;
    const sectionNumber = str(item.Number);
    const termId = str(item.TermId) ?? termLabel;
    const enrolled = toNum(item.Enrolled);
    const capacity = toNum(item.Capacity);
    const fmt = Array.isArray(item.FormattedMeetingTimes) ? item.FormattedMeetingTimes[0] : undefined;
    const buildingRaw = fmt && typeof fmt === "object" ? str(fmt.BuildingDisplay) : null;
    const building =
      buildingRaw && buildingRaw.length > 2 && buildingRaw !== "SJ" && buildingRaw !== "FR"
        ? buildingRaw
        : null;
    const roomRaw = fmt && typeof fmt === "object" ? str(fmt.RoomDisplay) : null;
    const room = roomRaw && roomRaw !== "*" ? roomRaw : null;
    const startTime =
      fmt && typeof fmt === "object"
        ? normalizeTime(fmt.StartTime ?? fmt.StartTimeDisplay ?? undefined)
        : "00:00";
    const endTime =
      fmt && typeof fmt === "object"
        ? normalizeTime(fmt.EndTime ?? fmt.EndTimeDisplay ?? undefined)
        : "23:59";
    const classCode = sectionNameDisplay
      ? sectionNameDisplay.replace(/\s*\([^)]*\)\s*$/, "").replace(/\*/g, "")
      : courseName
        ? courseName.replace(/\*/g, "") + (sectionNumber ? `-${sectionNumber}` : "")
        : course
          ? `${(course.SubjectCode ?? "").toString().trim()}${(course.Number ?? "").toString().trim()}` + (sectionNumber ? `-${sectionNumber}` : "")
          : "UNKNOWN";
    out.push({
      classCode,
      startTime,
      endTime,
      name,
      term: termId,
      building,
      room,
      sectionCode: sectionNumber ?? undefined,
      enrolled,
      capacity,
    });
  }
  return out;
}

/** When API returns top-level Sections array. Each item may be flat (SectionNameDisplay at top level) or wrapped as { Section, Term }. */
function flattenTopLevelSections(sections: UnbSectionRaw[]): SectionOut[] {
  const first = sections[0];
  if (!first) return [];
  if (first.Section && typeof first.Section === "object") {
    const termsAndSections: UnbTermAndSections[] = sections.map((item) => ({
      Term: item.Term && typeof item.Term === "object" ? item.Term : undefined,
      Sections: item.Section ? [{ Section: item.Section }] : [],
    }));
    return parseSectionsRetrieved({ TermsAndSections: termsAndSections });
  }
  if (first.SectionNameDisplay != null || first.FormattedMeetingTimes != null) {
    return flattenFlatSections(sections);
  }
  return sections.map((sec) => {
    const subject = (sec.SubjectCode ?? "").toString().trim();
    const num = (sec.Number ?? "").toString().trim();
    const classCodeBase = subject && num ? `${subject}${num}` : "UNKNOWN";
    const sectionCode = str(sec.SectionNumber);
    const classCode = sectionCode ? `${classCodeBase}-${sectionCode}` : classCodeBase;
    const name = str(sec.Title ?? sec.CourseTitle) ?? null;
    const termVal = sec.Term;
    const termStr =
      termVal && typeof termVal === "object" && termVal !== null
        ? str((termVal as UnbTermDetail).Description) ?? str((termVal as UnbTermDetail).Code) ?? null
        : str(termVal ?? sec.TermCode) ?? null;
    const building = str(sec.Building ?? sec.Location) ?? null;
    const buildingOk = building && building.length > 2 && building !== "SJ" && building !== "FR" ? building : null;
    return {
      classCode,
      startTime: normalizeTime(sec.StartTime ?? sec.MeetingTime),
      endTime: normalizeTime(sec.EndTime),
      name,
      term: termStr,
      building: buildingOk,
      room: str(sec.Room) ?? null,
      sectionCode: sectionCode ?? undefined,
      enrolled: toNum(sec.Enrolled),
      capacity: toNum(sec.Capacity),
    };
  });
}

/** Parse SectionsRetrieved.TermsAndSections (real API shape with building, room, times, term). */
function parseSectionsRetrieved(sr: UnbSectionsRetrieved): SectionOut[] {
  const out: SectionOut[] = [];
  const terms = sr.TermsAndSections ?? [];
  for (const termBlock of terms) {
    const termObj = termBlock.Term;
    const termLabel =
      termObj && typeof termObj === "object"
        ? str(termObj.Description) ?? str(termObj.Code) ?? null
        : null;
    const sectionList = termBlock.Sections ?? [];
    for (const item of sectionList) {
      const sec = item?.Section;
      if (!sec || typeof sec !== "object") continue;
      const sectionNameDisplay = str(sec.SectionNameDisplay);
      const courseName = str(sec.CourseName);
      const fullTitle = str(sec.FullTitleDisplay);
      const sectionTitle = str(sec.SectionTitleDisplay);
      const name = sectionTitle ?? fullTitle ?? null;
      const sectionNumber = str(sec.Number);
      const courseId = str(sec.CourseId);
      const termId = str(sec.TermId) ?? termLabel;
      const enrolled = toNum(sec.Enrolled);
      const capacity = toNum(sec.Capacity);
      const fmt = sec.FormattedMeetingTimes?.[0];
      const buildingRaw = fmt && typeof fmt === "object" ? str(fmt.BuildingDisplay) : null;
      const building =
        buildingRaw && buildingRaw.length > 2 && buildingRaw !== "SJ" && buildingRaw !== "FR"
          ? buildingRaw
          : null;
      const roomRaw = fmt && typeof fmt === "object" ? str(fmt.RoomDisplay) : null;
      const room = roomRaw && roomRaw !== "*" ? roomRaw : null;
      const startTime =
        fmt && typeof fmt === "object"
          ? normalizeTime(fmt.StartTime ?? fmt.StartTimeDisplay ?? undefined)
          : "00:00";
      const endTime =
        fmt && typeof fmt === "object"
          ? normalizeTime(fmt.EndTime ?? fmt.EndTimeDisplay ?? undefined)
          : "23:59";
      const classCode = sectionNameDisplay
        ? sectionNameDisplay.replace(/\s*\([^)]*\)\s*$/, "").replace(/\*/g, "")
        : courseName
          ? courseName.replace(/\*/g, "") + (sectionNumber ? `-${sectionNumber}` : "")
          : courseId
            ? `ID-${courseId}`
            : "UNKNOWN";
      out.push({
        classCode,
        startTime,
        endTime,
        name,
        term: termId,
        building,
        room,
        sectionCode: sectionNumber ?? undefined,
        enrolled,
        capacity,
      });
    }
  }
  return out;
}

async function main() {
  const { writeFileSync, mkdirSync } = await import("fs");
  const { dirname, resolve } = await import("path");
  const { token, cookie, locations, delayMs, outputPath } = parseArgs();
  if (!token || !cookie) {
    console.error("No auth. Pass --token and --cookie, or set DEFAULT_TOKEN/DEFAULT_COOKIE in this script.");
    process.exit(1);
  }

  let allSections: SectionOut[] = [];
  let viewUsed = "";

  // 1) Try SectionListing: prefer SectionsRetrieved.TermsAndSections (real building, room, times)
  let page = 1;
  let hasSectionData = false;
  while (true) {
    process.stdout.write(`[SectionListing] page ${page}... `);
    const { courses, sectionsOnly, sectionsRetrieved, _raw } = await fetchSectionPage(
      page,
      token,
      cookie,
      locations
    );
    if (page === 1 && _raw != null) {
      const debugPath = resolve(process.cwd(), "data/scrape-debug-page1.json");
      mkdirSync(dirname(debugPath), { recursive: true });
      writeFileSync(debugPath, JSON.stringify(_raw, null, 2), "utf-8");
      console.log("\n[DEBUG] First page raw response written to data/scrape-debug-page1.json");
      const raw = _raw as Record<string, unknown>;
      console.log("[DEBUG] Top-level keys:", Object.keys(raw));
      if (Array.isArray(raw.Sections) && raw.Sections.length > 0) {
        console.log("[DEBUG] First Sections[0] keys:", Object.keys(raw.Sections[0] as object));
        console.log("[DEBUG] First Sections[0] (sample):", JSON.stringify((raw.Sections[0] as object), null, 2).slice(0, 1200) + "...");
      }
      if (raw.SectionsRetrieved && typeof raw.SectionsRetrieved === "object") {
        const sr = raw.SectionsRetrieved as Record<string, unknown>;
        console.log("[DEBUG] SectionsRetrieved keys:", Object.keys(sr));
      }
      if (Array.isArray(raw.Courses) && raw.Courses.length > 0) {
        console.log("[DEBUG] First Courses[0] keys:", Object.keys(raw.Courses[0] as object));
      }
    }
    const termsAndSections = sectionsRetrieved?.TermsAndSections ?? [];
    if (termsAndSections.length > 0) {
      const flat = parseSectionsRetrieved({ TermsAndSections: termsAndSections });
      allSections.push(...flat);
      hasSectionData = flat.some(
        (s) => s.startTime !== "00:00" || s.endTime !== "23:59" || s.building != null || s.room != null
      );
      const sectionCount = termsAndSections.reduce((n, t) => n + (t.Sections?.length ?? 0), 0);
      console.log(`${sectionCount} sections from TermsAndSections (total ${allSections.length})`);
      if (sectionCount < PER_PAGE) break;
    } else if (sectionsOnly && sectionsOnly.length > 0) {
      const flat = flattenTopLevelSections(sectionsOnly);
      allSections.push(...flat);
      hasSectionData = flat.some(
        (s) => s.startTime !== "00:00" || s.endTime !== "23:59" || s.building != null || s.room != null
      );
      console.log(`${sectionsOnly.length} sections (total ${allSections.length})`);
      if (sectionsOnly.length < PER_PAGE) break;
    } else if (courses.length > 0) {
      const flat = flattenToSections(courses);
      allSections.push(...flat);
      hasSectionData = flat.some(
        (s) => s.startTime !== "00:00" || s.endTime !== "23:59" || s.building != null || s.room != null
      );
      console.log(`${courses.length} courses → ${flat.length} sections (total ${allSections.length})`);
      if (courses.length < PER_PAGE) break;
    } else {
      console.log("no more.");
      break;
    }
    page += 1;
    await delay(delayMs);
  }
  if (allSections.length > 0) viewUsed = "SectionListing";

  // 2) If no section data yet, fall back to catalog (course-only, placeholder times)
  if (allSections.length === 0 || !hasSectionData) {
    allSections = [];
    viewUsed = "CatalogListing";
    page = 1;
    while (true) {
      process.stdout.write(`[CatalogListing] page ${page}... `);
      const courses = await fetchPage(page, token, cookie, locations, "CatalogListing");
      if (courses.length === 0) {
        console.log("no more.");
        break;
      }
      allSections.push(...flattenToSections(courses));
      console.log(`${courses.length} courses (total ${allSections.length})`);
      if (courses.length < PER_PAGE) break;
      page += 1;
      await delay(delayMs);
    }
  }

  const outDir = dirname(resolve(process.cwd(), outputPath));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(process.cwd(), outputPath), JSON.stringify(allSections, null, 2), "utf-8");
  console.log(`Wrote ${allSections.length} sections to ${outputPath} (view: ${viewUsed})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
