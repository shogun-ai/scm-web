import React, { useEffect } from 'react';
import { ArrowLeft, Calendar, ArrowRight, ExternalLink } from 'lucide-react';

const BlogList = ({ posts, onBack, onNavigate }) => {
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      
      {/* Header */}
      <div className="bg-[#003B5C] py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="max-w-7xl mx-auto relative z-10">
            <button 
                onClick={onBack} 
                className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-6 hover:text-white transition-colors"
            >
                <ArrowLeft size={14} /> Нүүр хуудас руу буцах
            </button>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">Мэдээ мэдээлэл</h1>
            <p className="text-blue-100 max-w-2xl font-light">Санхүүгийн зах зээлийн сүүлийн үеийн мэдээ, манай байгууллагын үйл ажиллагааны тайлан.</p>
        </div>
      </div>

      {/* List */}
      <div className="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => {
                // Линк байгаа эсэхийг шалгах
                const hasLink = post.externalLink && post.externalLink.length > 0;

                return (
                    <div key={post.id} className="bg-white rounded-2xl shadow-xl overflow-hidden hover:-translate-y-2 transition-transform duration-300 border border-gray-100 flex flex-col group">
                        
                        {/* Image */}
                        <div className="h-52 overflow-hidden relative">
                            <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            {/* Image Overlay Link */}
                            {hasLink && (
                                <a 
                                    href={post.externalLink} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                >
                                    <span className="text-white font-bold uppercase text-xs tracking-widest border border-white px-4 py-2 flex items-center gap-2">
                                        Унших <ExternalLink size={12}/>
                                    </span>
                                </a>
                            )}
                        </div>
                        
                        {/* Content */}
                        <div className="p-6 flex flex-col flex-grow">
                            <div className="flex items-center gap-2 text-xs font-bold text-[#00A651] uppercase tracking-wider mb-3">
                                <Calendar size={14} />
                                <span>{post.date}</span>
                            </div>
                            
                            <h3 className="font-display font-bold text-xl mb-3 line-clamp-2 text-slate-800">
                                {post.title}
                            </h3>
                            
                            <p className="text-gray-500 text-sm line-clamp-3 mb-6 flex-grow">{post.excerpt}</p>
                            
                            {/* Buttons */}
                            <div className="pt-4 border-t border-gray-100">
                                {hasLink ? (
                                    // Хэрэв FRC линк байвал <a> таг ашиглана
                                    <a 
                                        href={post.externalLink}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-sm font-bold text-[#003B5C] hover:text-[#D4AF37] flex items-center gap-2 transition-colors w-fit"
                                    >
                                        Дэлгэрэнгүй <ExternalLink size={14} />
                                    </a>
                                ) : (
                                    // Линк байхгүй бол дотоод хуудас руу
                                    <button 
                                        onClick={() => onNavigate('blog_detail', post)}
                                        className="text-sm font-bold text-[#003B5C] hover:text-[#D4AF37] flex items-center gap-2 transition-colors"
                                    >
                                        Дэлгэрэнгүй <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

    </div>
  );
};

export default BlogList;