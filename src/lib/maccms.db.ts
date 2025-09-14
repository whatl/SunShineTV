
import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;

// 初始化连接池的函数
function initializePool() {
  // 仅当数据源是 maccms 并且尚未初始化时才创建连接池
  if (process.env.DATA_SOURCE === 'maccms' && !pool) {
    const { MAC_DB_HOST, MAC_DB_USER, MAC_DB_PASSWORD, MAC_DB_DATABASE } = process.env;

    // 检查所有必要的环境变量是否都已提供
    if (!MAC_DB_HOST || !MAC_DB_USER || !MAC_DB_PASSWORD || !MAC_DB_DATABASE) {
      console.error('[MACCMS_DB_CONFIG_ERROR] CMS数据源已启用，但数据库连接信息不完整。请检查 .env.local 文件中的 MAC_DB_* 变量。');
      return; // 不创建连接池，防止崩溃
    }

    console.log('[MACCMS_DB] 正在初始化苹果CMS数据库连接池...');
    pool = mysql.createPool({
      host: MAC_DB_HOST,
      user: MAC_DB_USER,
      password: MAC_DB_PASSWORD,
      database: MAC_DB_DATABASE,
      waitForConnections: true,
      connectionLimit: 10, // 可根据您的服务器性能调整
      queueLimit: 0,
    });
  }
}

// 在模块加载时执行一次初始化
initializePool();

/**
 * 从苹果CMS数据库执行一个查询。
 * @param sql - 要执行的SQL查询语句。
 * @param params - 查询参数，用于防止SQL注入。
 * @returns 返回查询结果。
 */
export async function queryCmsDB<T>(sql: string, params: any[] = []): Promise<T> {
  if (!pool) {
    // 如果连接池不存在（因为未配置或配置错误），则直接抛出错误
    // dataProvider 将会捕获这个错误并回退到默认数据源
    throw new Error('CMS数据库连接池未初始化，请检查配置。');
  }

  try {
    const [rows] = await pool.execute(sql, params);
    return rows as T;
  } catch (error) {
    console.error('[MACCMS_DB_QUERY_ERROR]', error);
    // 将原始错误向上抛出，以便 dataProvider 可以捕获它
    throw error;
  }
}

// ... (后续可以添加更多具体的查询函数，比如 getVodById, searchVod 等)
