import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import BlogList from '../components/BlogList';

export default function BlogSection({ getSectionBackgroundStyle }) {
  const { navigateTo } = useAppContext();
  return (
    <section id="blog" style={getSectionBackgroundStyle?.('blog', null, { fixed: false, surface: '#102D43' })} className="bg-[#102D43] py-20 md:py-24 text-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-10 gap-6">
          <div><span className="text-xs font-semibold tracking-[0.18em] text-[#D8C6A5] mb-4 block">МЭДЭЭ, МЭДЭЭЛЭЛ</span><h2 className="font-display font-bold text-3xl md:text-5xl tracking-tight">Блог & Мэдээ</h2></div>
          <button type="button" onClick={() => navigateTo('blog_list')} className="flex items-center gap-3 text-sm font-semibold rounded-full border border-white/25 px-5 py-3 hover:bg-white/10 transition">Бүх мэдээг харах <ArrowRight size={17} /></button>
        </div>
        <BlogList limit={4} embedded />
      </div>
    </section>
  );
}
