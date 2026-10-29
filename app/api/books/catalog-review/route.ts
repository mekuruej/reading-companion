import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { canReviewBookInfo } from "@/lib/teacher/bookInfoAccess";
import { pendingCatalogReview, CATALOG_REVIEW_COLUMNS, CATALOG_REVIEW_PAGE_SIZE } from "@/lib/books/catalogReview";
async function authorize(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return { error: NextResponse.json({error:"Sign in required."},{status:401}) };
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}
  });
  const {data,error} = await db.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({error:"Sign in required."},{status:401}) };
  const profile = await db.from("profiles").select("role,is_super_teacher").eq("id",data.user.id).maybeSingle();
  if (profile.error) throw profile.error;
  if (!canReviewBookInfo(profile.data)) return { error: NextResponse.json({error:"Admin or super teacher access required."},{status:403}) };
  return {db,user:data.user};
}
export async function GET(request: Request) {
  try {
    const auth=await authorize(request); if (auth.error) return auth.error;
    const url=new URL(request.url); const raw=url.searchParams.get("page") ?? "0";
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw)>1000000) return NextResponse.json({error:"Invalid page."},{status:400});
    const page=Number(raw), countOnly=url.searchParams.get("countOnly")==="1";
    let query=pendingCatalogReview(auth.db!.from("books").select(countOnly ? "id" : CATALOG_REVIEW_COLUMNS,{count:"exact",head:countOnly}));
    if (!countOnly) query=query.order("created_at",{ascending:true}).order("id",{ascending:true}).range(page*CATALOG_REVIEW_PAGE_SIZE,(page+1)*CATALOG_REVIEW_PAGE_SIZE-1);
    const {data,count,error}=await query;
    if(error || !Number.isSafeInteger(count) || count<0 || (!countOnly && !Array.isArray(data))) throw error ?? new Error("Incomplete queue");
    return NextResponse.json({books:countOnly?undefined:data,count,page,pageSize:CATALOG_REVIEW_PAGE_SIZE},{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"Could not load catalog review. Please retry."},{status:503}); }
}
export async function POST(request: Request) {
  try {
    const auth=await authorize(request);if(auth.error)return auth.error;
    const body=await request.json().catch(()=>null);
    if(!body || typeof body.bookId!=="string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.bookId))return NextResponse.json({error:"Invalid book."},{status:400});
    const {data,error}=await pendingCatalogReview(auth.db!.from("books").update({catalog_reviewed_at:new Date().toISOString(),catalog_reviewed_by:auth.user!.id}).eq("id",body.bookId)).select("id").maybeSingle();
    if(error)throw error;
    if(!data)return NextResponse.json({error:"This book is no longer pending. Refresh the queue."},{status:409});
    return NextResponse.json({ok:true});
  } catch {return NextResponse.json({error:"Could not mark reviewed. Please retry."},{status:503});}
}
