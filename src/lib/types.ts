import { AdminConfig } from './admin.types';

// 播放记录数据结构
export interface PlayRecord {
  title: string;
  source_name: string;
  cover: string;
  year: string;
  index: number; // 第几集
  total_episodes: number; // 总集数
  play_time: number; // 播放进度（秒）
  total_time: number; // 总进度（秒）
  save_time: number; // 记录保存时间（时间戳）
  search_title: string; // 搜索时使用的标题
}

// 收藏数据结构
export interface Favorite {
  source_name: string;
  total_episodes: number; // 总集数
  title: string;
  year: string;
  cover: string;
  save_time: number; // 记录保存时间（时间戳）
  search_title: string; // 搜索时使用的标题
  origin?: 'vod' | 'live';
}

// 存储接口
export interface IStorage {
  // 播放记录相关
  getPlayRecord(userName: string, key: string): Promise<PlayRecord | null>;
  setPlayRecord(
    userName: string,
    key: string,
    record: PlayRecord
  ): Promise<void>;
  getAllPlayRecords(userName: string): Promise<{ [key: string]: PlayRecord }>;
  deletePlayRecord(userName: string, key: string): Promise<void>;

  // 收藏相关
  getFavorite(userName: string, key: string): Promise<Favorite | null>;
  setFavorite(userName: string, key: string, favorite: Favorite): Promise<void>;
  getAllFavorites(userName: string): Promise<{ [key: string]: Favorite }>;
  deleteFavorite(userName: string, key: string): Promise<void>;

  // 用户相关
  registerUser(userName: string, password: string): Promise<void>;
  verifyUser(userName: string, password: string): Promise<boolean>;
  // 检查用户是否存在（无需密码）
  checkUserExist(userName: string): Promise<boolean>;
  // 修改用户密码
  changePassword(userName: string, newPassword: string): Promise<void>;
  // 删除用户（包括密码、搜索历史、播放记录、收藏夹）
  deleteUser(userName: string): Promise<void>;

  // 搜索历史相关
  getSearchHistory(userName: string): Promise<string[]>;
  addSearchHistory(userName: string, keyword: string): Promise<void>;
  deleteSearchHistory(userName: string, keyword?: string): Promise<void>;

  // 用户列表
  getAllUsers(): Promise<string[]>;

  // 管理员配置相关
  getAdminConfig(): Promise<AdminConfig | null>;
  setAdminConfig(config: AdminConfig): Promise<void>;

  // 跳过片头片尾配置相关
  getSkipConfig(
    userName: string,
    source: string,
    id: string
  ): Promise<SkipConfig | null>;
  setSkipConfig(
    userName: string,
    source: string,
    id: string,
    config: SkipConfig
  ): Promise<void>;
  deleteSkipConfig(userName: string, source: string, id: string): Promise<void>;
  getAllSkipConfigs(userName: string): Promise<{ [key: string]: SkipConfig }>;

  // 数据清理相关
  clearAllData(): Promise<void>;
}

// 搜索结果数据结构
export interface SearchResult {
  id: string; // 对应vodid 可有可无
  title: string;
  poster: string;
  episodes?: string[];
  episodes_titles?: string[];
  episodes_num?: number;
  source: string;
  source_name?: string;
  class?: string;
  year: string;
  desc?: string;
  type_name?: string;
  douban_id?: number; //真正的豆瓣id
  director?: string; // 导演
  actor?: string; // 主演
  ekey?: string; // 站外主键：标识数据来源的站点ID，仅站外搜索结果有值，本地数据为undefined
  need_decode?: boolean; // 是否需要解码才能播放：true表示需要通过解码接口解码URL后才能播放，false表示可以直接播放
  quality?: string; // 配置的清晰度（如"4K"、"1080p"等），仅当在配置文件中为该数据源配置了清晰度时才有值，用于直接显示无需测速
  remark?: string; // 更新备注（如"已完结"、"更新至第10集"等）
}

// 豆瓣数据结构
export interface DoubanItem {
  id: string; // 声明有，但豆瓣id可允许为空
  vodid?: string; // 对应的资源id可有可无，代表这个数据对应的id资源
  title: string;
  poster: string;
  rate: string;
  year: string;
}

export interface DoubanResult {
  list: DoubanItem[];
  code?: number;  // 可选，没有值或者 0/200 表示成功
  message?: string;
}

// 跳过片头片尾配置数据结构
export interface SkipConfig {
  enable: boolean; // 是否启用跳过片头片尾
  intro_time: number; // 片头时间（秒）
  outro_time: number; // 片尾时间（秒）
}

// 加密数据解码
export interface DecodeResponse {
  code?: number; // 响应值0或者200都是正确的
  data?: string; // 返回的可播放url
  message?: string; // 报错数据
}
