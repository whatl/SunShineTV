
// /app/api/cms/shine/detail/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const source = searchParams.get('source'); // source 在 maccms 中可能不是必须的，但保持接口一致性

  if (!id) {
    return NextResponse.json({ error: 'Query parameter "id" is required' }, { status: 400 });
  }
  if (!source) {
    return NextResponse.json({ error: 'Query parameter "source" is required' }, { status: 400 });
  }

  return NextResponse.json({ error: 'Failed to fetch detail result' }, { status: 500 });
}
