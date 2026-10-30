import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BlogCardSkeleton = () => (
    <div className="rounded-xl overflow-hidden bg-white/10 animate-pulse" aria-hidden="true">
        <div className="h-48 bg-white/20" />
        <div className="p-4 space-y-3">
            <div className="h-3 bg-white/20 rounded w-1/4" />
            <div className="h-5 bg-white/25 rounded w-3/4" />
            <div className="h-3 bg-white/15 rounded" />
            <div className="h-3 bg-white/15 rounded w-5/6" />
        </div>
    </div>
);

const BlogList = ({ onBack, limit, embedded = false }) => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [retry, setRetry] = useState(0);
    const containerClass = embedded ? 'w-full' : 'w-full max-w-7xl mx-auto px-4 pt-24 pb-12';

    useEffect(() => {
        const controller = new AbortController();
        const fetchBlogs = async () => {
            try {
                setLoading(true);
                setFailed(false);
                const baseUrl = window.location.hostname === 'localhost'
                    ? 'http://localhost:5000/api/blogs'
                    : 'https://scm-okjs.onrender.com/api/blogs';

                const finalUrl = limit ? `${baseUrl}?limit=${limit}` : baseUrl;
                const response = await axios.get(finalUrl, { signal: controller.signal, timeout: 15000 });
                setBlogs(Array.isArray(response.data) ? response.data : []);
            } catch {
                if (!controller.signal.aborted) setFailed(true);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        fetchBlogs();
        return () => controller.abort();
    }, [limit, retry]);

    if (loading) {
        return (
            <div className={containerClass}>
                <p className="sr-only" aria-live="polite">Мэдээ ачааллаж байна...</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <BlogCardSkeleton />
                    <BlogCardSkeleton />
                    <BlogCardSkeleton />
                </div>
            </div>
        );
    }

    return (
        /* 1. Дээд талаас нь зай авч (pt-24) цэсэнд даруулахаас хамгаална */
        <div className={containerClass}>
            
            {/* 2. Нүүр хуудас руу буцах товчийг цэвэрхэн байрлуулах */}
            {onBack && (
                <button 
                    onClick={onBack}
                    className="mb-8 flex items-center text-white/70 hover:text-[#D4AF37] transition-colors group"
                >
                    <span className="mr-2">←</span> 
                    <span className="text-sm font-bold uppercase tracking-wider">Буцах</span>
                </button>
            )}

            {failed ? <div role="status" className="rounded-xl border border-white/15 px-6 py-8 text-white/80"><p>Мэдээ ачааллах боломжгүй байна.</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 min-h-11 rounded-lg border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">Дахин оролдох</button></div> : blogs.length === 0 ? <p role="status" className="border-t border-white/15 py-8 text-sm text-white/70">Одоогоор нийтлэгдсэн мэдээ байхгүй байна.</p> : null}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {blogs.map((blog, idx) => {
                    const sourceColors = {
                        'Ikon': 'bg-[#00A651]',
                        'Golomt': 'bg-[#1a2e5a]',
                        'TavanBogd': 'bg-[#ed1c24]',
                        'TDB Securities': 'bg-[#f68b1e]'
                    };

                    return (
                        <article key={blog._id || idx} className="group bg-[#0b2336] border border-white/15 rounded-2xl overflow-hidden hover:border-[#D4AF37]/40 transition-all duration-300 flex flex-col h-full">
                            {/* Зургийн хэсэг */}
                            <div className="h-48 overflow-hidden relative">
                                <img
                                    src={blog.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80"}
                                    alt={blog.title}
                                    loading="lazy"
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                />
                                <div className={`absolute top-4 left-4 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg ${sourceColors[blog.source] || 'bg-gray-600'}`}>
                                    {blog.source}
                                </div>
                            </div>

                            {/* Агуулгын хэсэг - Текстийг тод харагдуулах (text-white) */}
                            <div className="p-6 flex flex-col flex-grow">
                                <span className="text-[#D4AF37] text-[10px] font-bold uppercase mb-2">
                                    {blog.pubDate ? new Date(blog.pubDate).toLocaleDateString('mn-MN') : 'Саяхан'}
                                </span>
                                
                                {/* Гарчиг - text-white өнгө өгсөн */}
                                <h3 className="font-bold text-base text-white mb-3 line-clamp-2 leading-snug min-h-[3rem]">
                                    {blog.title}
                                </h3>
                                
                                {/* Хураангуй - Текст харагдахгүй байвал text-gray-400 болгосон */}
                                <p className="text-gray-400 text-xs line-clamp-3 mb-6 flex-grow leading-relaxed">
                                    {blog.contentSnippet || "Мэдээний дэлгэрэнгүйг холбоос дээр дарж үзнэ үү."}
                                </p>
                                
                                <a 
                                    href={blog.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center text-[#D4AF37] font-bold text-[10px] uppercase hover:gap-2 transition-all duration-300"
                                >
                                    Дэлгэрэнгүй унших <span className="ml-1">↗</span>
                                </a>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default BlogList;
