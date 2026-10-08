import React from 'react';
import { useAppContext } from '../context/AppContext';
import { BACKGROUNDS } from '../data/constants';
import BlogList from '../components/BlogList';
import ScrollDownArrow from '../components/ScrollDownArrow';

export default function BlogSection({ getSectionBackgroundStyle }) {
  const { navigateTo } = useAppContext();

  return (
    <section id="blog" className="py-24 relative min-h-[90vh] flex items-center sc-section-band" style={getSectionBackgroundStyle('blog', BACKGROUNDS.blog)}>
        <div className="absolute inset-0 sc-overlay-90"></div>
        <div className="max-w-7xl mx-auto px-4 md:px-6 w-full relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                <div className="text-center md:text-left">
                    <span className="sc-kicker mb-2 block">Мэдээ мэдээлэл</span>
                    <h2 className="font-display font-extrabold text-3xl md:text-5xl text-white">Блог & Мэдээ</h2>
                </div>
                <button onClick={() => navigateTo('blog_list')} className="sc-secondary-button rounded-full px-8 py-3 text-white font-bold text-xs uppercase transition-all">Бүх мэдээг харах</button>
            </div>
            <BlogList limit={4} />
        </div>
        <ScrollDownArrow targetId="contact" />
    </section>
  );
}
