
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import protobuf from 'protobufjs';

import { TABLE_PREFIX } from '@/lib/maccms.config';
import { queryCmsDB } from '@/lib/maccms.db';
import { getChildCategoryIds, translateCategory } from '@/lib/maccms.helper';
import { DoubanResult } from '@/lib/types';

const PAGE_SIZE = 20;


interface VodRow {
  vod_id: number;
  vod_douban_id: string;
  vod_name: string;
  vod_pic: string;
  vod_year: string;
  vod_remarks: string;
  vod_douban_score: number | null;
  vod_score: string | null;
}

function mapToDoubanItem(rows: VodRow[]): DoubanResult {
  if (!Array.isArray(rows)) {
    return { code: 200, message: 'Success', list: [] };
  }
  const list = rows.map(row => ({
    id: String(row.vod_douban_id || ''),
    vodid: String(row.vod_id || ''),
    title: row.vod_name,
    poster: row.vod_pic,
    rate: row.vod_douban_score ? row.vod_douban_score.toString() : (row.vod_score || '0'),
    year: row.vod_year,
    remarks: row.vod_remarks,
  }));
  return { code: 200, message: 'Success', list };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categoryShortName = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1');

  if (!categoryShortName) {
    return new NextResponse('Category parameter is required', { status: 400 });
  }
  if (page < 1) {
    return new NextResponse('Page Error', { status: 400 });
  }

  try {
    const typeEn = translateCategory(categoryShortName);
    if (!typeEn) {
      return new NextResponse(`Invalid category: ${categoryShortName}`, { status: 400 });
    }

    const categoryIds = await getChildCategoryIds(typeEn);
    if (categoryIds.length === 0) {
      return NextResponse.json({ code: 200, message: `Category '${typeEn}' not found`, list: [] });
    }

    const offset = (page - 1) * PAGE_SIZE;
    const commonFields = 'vod_id,vod_douban_id, vod_name, vod_pic, vod_year, vod_remarks, vod_douban_score, vod_score';
    const placeholders = categoryIds.map(() => '?').join(',');
    const sql = `
      SELECT ${commonFields}
      FROM ${TABLE_PREFIX}vod
      WHERE vod_status = 1 AND type_id IN (${placeholders})
      ORDER BY vod_time DESC
      LIMIT ?
      OFFSET ?
    `;
  
    const params: (string | number)[] = [...categoryIds, PAGE_SIZE, offset];
    const results = await queryCmsDB<VodRow[]>(sql, params);
    const responseData = mapToDoubanItem(results);
    if (process.env.API_PROTOCOL === 'proto') {
      const protoPath = path.join(process.cwd(), 'src', 'lib', 'protos', 'maccms.proto');
      const root = await protobuf.load(protoPath);
      const DoubanResult = root.lookupType('maccms.DoubanResult');
      const message = DoubanResult.create(responseData);
      const buffer = DoubanResult.encode(message).finish();
      return new NextResponse(buffer, {
        headers: { 'Content-Type': 'application/x-protobuf' },
      });
    }
    return NextResponse.json(responseData);

  } catch (error) {
    console.log(error)
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
