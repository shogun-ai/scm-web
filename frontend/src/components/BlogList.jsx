import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BlogList = ({ onBack, limit }) => {
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                setLoading(true);
                const baseUrl = window.location.hostname === 'localhost' 
                    ? 'http://localhost:5000/api/blogs' 
                    : 'https://scm-backend-okjs.onrender.com/api/blogs';
                
                const finalUrl = limit ? `${baseUrl}?limit=${limit}` : baseUrl;
                const response = await axios.get(finalUrl);
                setBlogs(response.data); 
            } catch (err) {
                console.error("Алдаа:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchBlogs();
    }, [limit]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20 w-full">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37]"></div>
            </div>
        );
    }

    return (
        /* 1. Дээд талаас нь зай авч (pt-24) цэсэнд даруулахаас хамгаална */
        <div className="w-full max-w-7xl mx-auto px-4 pt-24 pb-12">
            
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {blogs.map((blog, idx) => {
                    const sourceColors = {
                        'Ikon': 'bg-[#00A651]',
                        'Golomt': 'bg-[#1a2e5a]',
                        'TavanBogd': 'bg-[#ed1c24]',
                        'TDB Securities': 'bg-[#f68b1e]'
                    };

                    return (
                        <div key={blog._id || idx} className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden hover:border-[#D4AF37]/40 transition-all duration-300 flex flex-col h-full shadow-2xl">
                            {/* Зургийн хэсэг */}
                            <div className="h-48 overflow-hidden relative">
                                <img 
                                    src={blog.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=80"} 
                                    alt={blog.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                                />
                                <div className={`absolute top-4 left-4 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-lg ${sourceColors[blog.source] || 'bg-gray-600'}`}>
                                    {blog.source}
                                </div>
                            </div>

                            {/* Агуулгын хэсэг - Текстийг тод харагдуулах (text-white) */}
                            <div className="p-6 flex flex-col flex-grow bg-[#1a1a1a]">
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
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BlogList;