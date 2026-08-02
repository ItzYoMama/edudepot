'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const categories = [
    { name: 'English', icon: '📖', color: 'from-blue-500/10 to-cyan-500/10 border-blue-200 text-blue-700' },
    { name: 'Math', icon: '📐', color: 'from-emerald-500/10 to-teal-500/10 border-emerald-200 text-emerald-700' },
    { name: 'Science', icon: '🔬', color: 'from-purple-500/10 to-indigo-500/10 border-purple-200 text-purple-700' },
    { name: 'Filipino', icon: '🇵🇭', color: 'from-rose-500/10 to-orange-500/10 border-rose-200 text-rose-700' },
    { name: 'Araling Panlipunan', icon: '🌏', color: 'from-amber-500/10 to-yellow-500/10 border-amber-200 text-amber-700' },
    { name: 'MAPEH', icon: '🎨', color: 'from-pink-500/10 to-fuchsia-500/10 border-pink-200 text-pink-700' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      
      {/* 🟢 NAVIGATION BAR */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-black text-lg sm:text-xl">
              E
            </div>
            <div className="flex items-center">
              <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500 bg-clip-text text-transparent">
                EduDepot
              </span>
              <span className="ml-1 text-[10px] sm:text-xs bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-full border border-blue-200">
                PH
              </span>
            </div>
          </Link>

          {/* Desktop Button */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/store"
              className="relative group overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-[1px] font-semibold text-white shadow-md hover:shadow-lg transition-all"
            >
              <span className="block px-5 py-2.5 rounded-[11px] bg-gradient-to-r from-blue-600 to-indigo-600 text-sm">
                Mag-browse sa Store ➔
              </span>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-3">
            <Link
              href="/store"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md text-sm"
            >
              Mag-browse sa Store ➔
            </Link>
          </div>
        )}
      </header>

      {/* 🚀 HERO SECTION */}
      <section className="relative overflow-hidden bg-slate-900 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        {/* Glow Effects */}
        <div className="absolute -top-40 -left-40 w-72 sm:w-96 h-72 sm:h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-72 sm:w-96 h-72 sm:h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center z-10">
          <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 backdrop-blur-md text-blue-400 text-xs font-semibold px-3 sm:px-4 py-1.5 rounded-full mb-6">
            <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-ping" />
            Para sa mga Gurong Pilipino 🇵🇭
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4 sm:mb-6 leading-tight">
            High-Quality Teaching Materials, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent">
              Ready to Print & Use.
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-slate-300 mb-8 sm:mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Makatipid sa oras sa paggawa ng lesson plans, modules, at worksheets. Kumuha ng DepEd-aligned learning resources sa abot-kayang presyo!
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
            <Link
              href="/store"
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold px-8 py-3.5 sm:py-4 rounded-xl shadow-lg shadow-blue-500/25 transition transform active:scale-95 text-base text-center"
            >
              Tingnan ang Lahat ng Materials
            </Link>
          </div>

          {/* Responsive Quick Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-lg mx-auto mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-slate-800">
            <div>
              <p className="text-xl sm:text-2xl font-black text-white">100%</p>
              <p className="text-[11px] sm:text-xs text-slate-400">DepEd Aligned</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-white">Instant</p>
              <p className="text-[11px] sm:text-xs text-slate-400">File Download</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-white">GCash</p>
              <p className="text-[11px] sm:text-xs text-slate-400">Easy Payment</p>
            </div>
          </div>
        </div>
      </section>

      {/* 📚 SUBJECT CATEGORIES SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1 sm:mb-2">Mga Asignatura / Subjects</h2>
          <p className="text-xs sm:text-sm text-slate-500">Pumili batay sa asignaturang iyong itinuturo</p>
        </div>

        {/* Responsive Grid: 2 columns on mobile, 3 on tablet, 6 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              href="/store"
              className={`group relative p-4 sm:p-6 rounded-2xl border bg-gradient-to-b ${cat.color} transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col items-center text-center`}
            >
              <div className="text-3xl sm:text-4xl mb-2 sm:mb-3 transform group-hover:scale-110 transition duration-300">
                {cat.icon}
              </div>
              <div className="font-bold text-xs sm:text-sm text-slate-800 group-hover:text-blue-600 transition">
                {cat.name}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ⭐ BENEFITS SECTION */}
      <section className="bg-white border-y border-slate-200/80 py-12 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Bakit sa EduDepot PH?</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">Dinisenyo para mas madali at mabilis ang pagtuturo mo.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-md mb-4 sm:mb-6">
                ⚡
              </div>
              <h3 className="font-bold text-lg sm:text-xl text-slate-900 mb-2">Instant Download</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Matatanggap agad ang file sa email o dashboard pagkatapos ma-verify ang GCash payment. No waiting time!
              </p>
            </div>

            <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-md mb-4 sm:mb-6">
                📄
              </div>
              <h3 className="font-bold text-lg sm:text-xl text-slate-900 mb-2">Print Ready Files</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Naka-format na sa PDF, DOCX, o PPTX kaya gagamitin at idi-ditto mo na lang diretso sa klase.
              </p>
            </div>

            <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200/60 shadow-sm">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-md mb-4 sm:mb-6">
                🇵🇭
              </div>
              <h3 className="font-bold text-lg sm:text-xl text-slate-900 mb-2">DepEd Aligned</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Angkop sa MELCs at kasalukuyang K-12 / MATATAG curriculum mula Kindergarten hanggang High School.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 📌 FOOTER */}
      <footer className="bg-slate-950 text-slate-400 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6 text-xs sm:text-sm text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              E
            </div>
            <div>
              <p className="font-bold text-white">EduDepot PH</p>
              <p className="text-[11px] text-slate-500">Teaching & Learning Materials Hub</p>
            </div>
          </div>
          <div className="flex gap-6 text-xs font-medium">
            <Link href="/store" className="hover:text-white transition">
              Storefront
            </Link>
            <Link href="/admin/login" className="hover:text-white transition">
              Admin Access
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}