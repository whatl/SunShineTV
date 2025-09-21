
// /app/api/cms/shine/detail/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getMacCMSVideoDetail } from '../../../../../lib/maccms.db'; // 假设的数据库函数
import { getProtoRoot } from '../../../../../lib/maccms-proto';
import { SearchResult } from '../../../../../lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const source = searchParams.get('source'); // source 在 maccms 中可能不是必须的，但保持接口一致性

  if (!id) {
    return NextResponse.json({ error: 'Query parameter "id" is required' }, { status: 400 });
  }

  try {
    const detailResult: SearchResult | null = await getMacCMSVideoDetail({ id });

    if (!detailResult) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    const acceptHeader = request.headers.get('Accept');
    if (acceptHeader && acceptHeader.includes('application/x-protobuf')) {
      const root = await getProtoRoot();
      const SearchResultType = root.lookupType("maccms.SearchResult");

      const errMsg = SearchResultType.verify(detailResult);
      if (errMsg) throw Error(errMsg);

      const message = SearchResultType.create(detailResult);
      const buffer = SearchResultType.encode(message).finish();

      return new NextResponse(buffer, {
        status: 200,
        headers: { 'Content-Type': 'application/x-protobuf' },
      });
    } else {
      // 默认返回 JSON
      return NextResponse.json(detailResult);
    }
  } catch (error) {
    console.error('[CMS Detail API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch detail result' }, { status: 500 });
  }
}
