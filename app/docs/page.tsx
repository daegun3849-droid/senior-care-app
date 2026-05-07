import fs from "fs";
import path from "path";
import Link from "next/link";

/**
 * CHANGELOG·개발일지를 한 화면에서 보기 (사무실·집 PC 동일 URL)
 */
const DocsPage = () => {
  const cwd = process.cwd();
  const changelogPath = path.join(cwd, "CHANGELOG.md");
  const journalPath = path.join(cwd, "AI플래너_개발일지.txt");

  const changelog = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, "utf8")
    : "(CHANGELOG.md 없음)";
  const journal = fs.existsSync(journalPath)
    ? fs.readFileSync(journalPath, "utf8")
    : "(AI플래너_개발일지.txt 없음)";

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-8 md:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-[#1A202C]">개발 문서</h1>
            <p className="text-[12px] md:text-[13px] text-slate-500 mt-1 leading-relaxed">
              왼쪽은 코드 변경 타임라인(CHANGELOG), 오른쪽은 맥락·메모(개발일지). git push 후 Vercel에 반영되면
              사무실에서도 같은 주소로 열 수 있습니다.
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 text-[13px] font-bold text-emerald-600 hover:text-emerald-700 underline-offset-2 hover:underline"
          >
            ← 앱으로
          </Link>
        </div>

        <nav className="flex flex-wrap gap-3 mb-4 text-[12px] font-bold text-slate-600">
          <a href="#changelog" className="rounded-full bg-white px-3 py-1 border border-slate-200 hover:border-emerald-300">
            CHANGELOG.md로 이동
          </a>
          <a href="#journal" className="rounded-full bg-white px-3 py-1 border border-slate-200 hover:border-emerald-300">
            개발일지로 이동
          </a>
        </nav>

        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <section
            id="changelog"
            className="rounded-3xl border border-white bg-white p-4 shadow-lg md:max-h-[calc(100vh-12rem)] md:overflow-hidden md:flex md:flex-col"
          >
            <h2 className="mb-2 shrink-0 text-[14px] font-black text-slate-400 uppercase tracking-wider">
              CHANGELOG.md
            </h2>
            <pre className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-slate-800 md:overflow-y-auto md:flex-1 md:pr-1">
              {changelog}
            </pre>
          </section>

          <section
            id="journal"
            className="rounded-3xl border border-white bg-white p-4 shadow-lg md:max-h-[calc(100vh-12rem)] md:overflow-hidden md:flex md:flex-col"
          >
            <h2 className="mb-2 shrink-0 text-[14px] font-black text-slate-400 uppercase tracking-wider">
              AI플래너_개발일지.txt
            </h2>
            <pre className="font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-slate-800 md:overflow-y-auto md:flex-1 md:pr-1">
              {journal}
            </pre>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;
