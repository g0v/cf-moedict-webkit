// CloudFlare Worker 環境變數類型定義
export interface Env {
  // KV Storage 用於字典資料
  DICTIONARY: KVNamespace;

  // R2 Storage 用於字體檔案和靜態資源
  FONTS: R2Bucket;
  ASSETS: R2Bucket;

  // 環境變數
  FONT_BASE_URL?: string;
  ASSET_BASE_URL?: string;
}

// 字典語言類型
export type DictionaryLang = 'a' | 't' | 'h' | 'c';

// 字典資料結構
export interface DictionaryEntry {
  t?: string; // title
  h?: Heteronym[]; // heteronyms
  english?: string;
  radical?: string;
  stroke_count?: number;
  non_radical_stroke_count?: number;
  pinyin?: string;
  translation?: Record<string, string>;
}

export interface Heteronym {
  id?: string;
  audio_id?: string;
  bopomofo?: string;
  trs?: string;
  py?: string;
  pinyin?: string;
  definitions?: Definition[];
  antonyms?: string[];
  synonyms?: string[];
  variants?: string[];
  specific_to?: string;
  alt?: string;
}

export interface Definition {
  type?: string;
  def?: string;
  example?: string[];
  quote?: string[];
  link?: string[];
}

// 跨語言對照資料
export interface XRefData {
  [targetLang: string]: {
    [wordId: string]: string[];
  };
}

// 字體配置
export interface FontConfig {
  name: string;
  displayName: string;
  category: string;
  fallback?: string;
}

// 字體映射
export const FONT_MAP: Record<string, FontConfig> = {
  'kai': { name: 'TW-Kai', displayName: '楷書', category: '全字庫' },
  'sung': { name: 'TW-Sung', displayName: '宋體', category: '全字庫' },
  'ebas': { name: 'EBAS', displayName: '篆文', category: '全字庫' },
  'shuowen': { name: 'ShuoWen', displayName: '說文標篆', category: '逢甲大學' },
  'cwming': { name: 'cwTeXQMing', displayName: '明體', category: 'cwTeX Q' },
  'cwhei': { name: 'cwTeXQHei', displayName: '黑體', category: 'cwTeX Q' },
  'cwyuan': { name: 'cwTeXQYuan', displayName: '圓體', category: 'cwTeX Q' },
  'cwkai': { name: 'cwTeXQKai', displayName: '楷書', category: 'cwTeX Q' },
  'cwfangsong': { name: 'cwTeXQFangsong', displayName: '仿宋', category: 'cwTeX Q' },
  'srcx': { name: 'SourceHanSansTCExtraLight', displayName: '特細', category: '思源黑體' },
  'srcl': { name: 'SourceHanSansTCLight', displayName: '細體', category: '思源黑體' },
  'srcn': { name: 'SourceHanSansTCNormal', displayName: '標準', category: '思源黑體' },
  'srcr': { name: 'SourceHanSansTCRegular', displayName: '正黑', category: '思源黑體' },
  'srcm': { name: 'SourceHanSansTCMedium', displayName: '中黑', category: '思源黑體' },
  'srcb': { name: 'SourceHanSansTCBold', displayName: '粗體', category: '思源黑體' },
  'srch': { name: 'SourceHanSansTCHeavy', displayName: '特粗', category: '思源黑體' },
  'shsx': { name: 'SourceHanSerifTCExtraLight', displayName: '特細', category: '思源宋體' },
  'shsl': { name: 'SourceHanSerifTCLight', displayName: '細體', category: '思源宋體' },
  'shsm': { name: 'SourceHanSerifTCMedium', displayName: '正宋', category: '思源宋體' },
  'shsr': { name: 'SourceHanSerifTCRegular', displayName: '標準', category: '思源宋體' },
  'shss': { name: 'SourceHanSerifTCSemiBold', displayName: '中宋', category: '思源宋體' },
  'shsb': { name: 'SourceHanSerifTCBold', displayName: '粗體', category: '思源宋體' },
  'shsh': { name: 'SourceHanSerifTCHeavy', displayName: '特粗', category: '思源宋體' },
  'gwmel': { name: 'GenWanMinTWEL', displayName: '特細', category: '源雲明體' },
  'gwml': { name: 'GenWanMinTWL', displayName: '細體', category: '源雲明體' },
  'gwmr': { name: 'GenWanMinTWR', displayName: '標準', category: '源雲明體' },
  'gwmm': { name: 'GenWanMinTWM', displayName: '正明', category: '源雲明體' },
  'gwmsb': { name: 'GenWanMinTWSB', displayName: '中明', category: '源雲明體' },
  'openhuninn': { name: 'jf-openhuninn-2.1', displayName: 'Open 粉圓', category: 'Justfont' },
  'rxkt': { name: 'Typography', displayName: '特殊字體', category: '其他' },
};

// 王漢宗字體映射
export const WT2FONT: Record<string, string> = {
  'wt071': 'HanWangShinSuMedium',
  'wt024': 'HanWangFangSongMedium',
  'wt021': 'HanWangLiSuMedium',
  'wt001': 'HanWangMingLight',
  'wt002': 'HanWangMingMedium',
  'wt003': 'HanWangMingBold',
  'wt005': 'HanWangMingBlack',
  'wt004': 'HanWangMingHeavy',
  'wt006': 'HanWangYenLight',
  'wt009': 'HanWangYenHeavy',
  'wt011': 'HanWangHeiLight',
  'wt014': 'HanWangHeiHeavy',
  'wt064': 'HanWangYanKai',
  'wt028': 'HanWangKanDaYan',
  'wt034': 'HanWangKanTan',
  'wt040': 'HanWangZonYi',
  'wtcc02': 'HanWangCC02',
  'wtcc15': 'HanWangCC15',
  'wthc06': 'HanWangGB06',
};

export const FONT2NAME: Record<string, string> = {
  'HanWangMingMedium': '中明體',
  'HanWangYenHeavy': '特圓體',
  'HanWangYenLight': '細圓體',
  'HanWangShinSuMedium': '中行書',
  'HanWangGB06': '鋼筆行楷',
  'HanWangHeiHeavy': '特黑體',
  'HanWangMingLight': '細明體',
  'HanWangHeiLight': '細黑體',
  'HanWangFangSongMedium': '中仿宋',
  'HanWangMingBold': '粗明體',
  'HanWangMingBlack': '超明體',
  'HanWangYanKai': '顏楷體',
  'HanWangMingHeavy': '特明體',
  'HanWangCC02': '酷儷海報',
  'HanWangLiSuMedium': '中隸書',
  'HanWangKanDaYan': '空疊圓',
  'HanWangKanTan': '勘亭流',
  'HanWangCC15': '酷正海報',
  'HanWangZonYi': '綜藝體',
  'ShuoWen': '說文標篆',
};

// 語言對應的 Hash 符號
export const HASH_OF: Record<DictionaryLang, string> = {
  'a': '#',
  't': "#'",
  'h': '#:',
  'c': '#~',
};

// 語言標題
export const TITLE_OF: Record<DictionaryLang, string> = {
  'a': '',
  't': '台語',
  'h': '客語',
  'c': '兩岸',
};

// 圖片生成相關類型
export interface ImageGenerationOptions {
  text: string;
  font: string;
  width?: number;
  height?: number;
}

export interface LayoutDimensions {
  width: number;
  height: number;
  rows: number;
  cols: number;
}

export interface CharPosition {
  x: number;
  y: number;
}

// API 回應類型
export interface DictionaryAPIResponse {
  id?: string;
  type?: 'term' | 'list' | 'radical';
  title?: string;
  english?: string;
  heteronyms?: Heteronym[];
  radical?: string;
  stroke_count?: number;
  non_radical_stroke_count?: number;
  pinyin?: string;
  translation?: Record<string, string>;
  xrefs?: Array<{
    lang: DictionaryLang;
    words: string[];
  }>;
  terms?: string;
}

// 錯誤回應類型
export interface ErrorResponse {
  error: string;
  message: string;
  terms?: string[];
}
