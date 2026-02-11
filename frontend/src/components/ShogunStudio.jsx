import React, { useEffect } from 'react';
import { Code, Layers, Smartphone, Mail, ArrowLeft, Globe, Monitor, Zap } from 'lucide-react';

const ShogunStudio = ({ onBack }) => {
  useEffect(() => window.scrollTo(0, 0), []);

  const services = [
    { title: "Web Development", desc: "Орчин үеийн React, Next.js технологи ашиглан хурдтай, найдвартай вэб сайт бүтээнэ.", icon: Globe },
    { title: "Web Application", desc: "Байгууллагын дотоод систем, бүртгэлийн программ, CRM шийдлүүд.", icon: Monitor },
    { title: "UI/UX Design", desc: "Хэрэглэгчдэд ээлтэй, нүд баясгам орчин үеийн загвар шийдэл.", icon: Layers },
    { title: "Automation", desc: "Бизнесийн үйл ажиллагааг хөнгөвчлөх автоматжуулалтын системүүд.", icon: Zap },
  ];

  const portfolio = [
    { title: "Solongo Capital", cat: "Corporate Website", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
    { title: "Tech Vision", cat: "SaaS Dashboard", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
    { title: "Luxury Estate", cat: "Real Estate Platform", img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#D4AF37] selection:text-black">
      
      {/* HEADER / NAV */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/5 py-4 px-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Code className="text-[#D4AF37]" size={28} />
            <h2 className="text-xl font-bold tracking-widest font-display">ShogunAi <span className="text-[#D4AF37]">Studio</span></h2>
        </div>
        <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider border border-[#D4AF37] text-[#D4AF37] px-4 py-2 rounded-full hover:bg-[#D4AF37] hover:text-black transition-all duration-300"
        >
            <ArrowLeft size={14} /> Буцах
        </button>
      </nav>

      {/* HERO SECTION */}
      <section className="relative h-screen flex flex-col justify-center items-center text-center px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D4AF37]/10 via-[#050505] to-[#050505]"></div>
        <div className="relative z-10 space-y-6 max-w-4xl">
            <p className="text-[#D4AF37] text-sm uppercase tracking-[0.5em] animate-pulse">Creative Digital Agency</p>
            <h1 className="text-5xl md:text-8xl font-bold font-display leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
                WE BUILD <br/> <span className="text-[#D4AF37]">DIGITAL EMPRIES</span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
                Бид таны бизнесийн санааг дижитал ертөнцөд амилуулна. <br/> Вэб хөгжүүлэлт, дизайн, аппликэшн.
            </p>
            <div className="pt-8">
                <button className="bg-[#D4AF37] text-black px-10 py-4 rounded-none font-bold uppercase tracking-widest hover:bg-white transition-colors duration-300">
                    Холбоо барих
                </button>
            </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-24 px-6 md:px-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
            <h3 className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] mb-12">Бидний үйлчилгээ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {services.map((s, i) => (
                    <div key={i} className="p-8 border border-white/10 hover:border-[#D4AF37]/50 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500 group">
                        <s.icon className="text-[#D4AF37] mb-6 group-hover:scale-110 transition-transform" size={40} />
                        <h4 className="text-xl font-bold mb-4 font-display">{s.title}</h4>
                        <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section className="py-24 px-6 md:px-20 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-16">
                <div>
                    <h3 className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] mb-4">Портфолио</h3>
                    <h2 className="text-4xl font-bold font-display">Сүүлд хийгдсэн ажлууд</h2>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {portfolio.map((p, i) => (
                    <div key={i} className="group cursor-pointer">
                        <div className="relative h-80 overflow-hidden mb-6 border border-white/10">
                            <img src={p.img} alt={p.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0" />
                            <div className="absolute inset-0 bg-black/50 group-hover:bg-transparent transition-colors duration-500"></div>
                        </div>
                        <h4 className="text-2xl font-bold font-display group-hover:text-[#D4AF37] transition-colors">{p.title}</h4>
                        <p className="text-gray-500 text-sm mt-2 uppercase tracking-wider">{p.cat}</p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="py-24 px-6 md:px-20 border-t border-white/5 flex flex-col md:flex-row gap-20 items-center justify-between">
        <div className="w-full md:w-1/2">
            <h2 className="text-5xl md:text-7xl font-bold font-display mb-8 text-[#D4AF37]">LET'S WORK <br/> TOGETHER</h2>
            <div className="space-y-6 text-lg text-gray-300">
                <div className="flex items-center gap-4">
                    <Mail className="text-[#D4AF37]" />
                    <a href="mailto:info@shogunai.mn" className="hover:text-white transition">info@shogunai.mn</a>
                </div>
                <div className="flex items-center gap-4">
                    <Smartphone className="text-[#D4AF37]" />
                    <span>+976 9911-XXXX</span>
                </div>
                <div className="flex items-center gap-4">
                    <Globe className="text-[#D4AF37]" />
                    <span>Ulaanbaatar, Mongolia</span>
                </div>
            </div>
        </div>
        
        {/* Simple Form */}
        <div className="w-full md:w-1/2 bg-white/5 p-10 border border-white/10">
             <form className="space-y-6">
                 <div>
                     <label className="text-xs uppercase tracking-widest text-gray-500 mb-2 block">Таны нэр</label>
                     <input type="text" className="w-full bg-black/50 border border-white/20 p-4 text-white focus:border-[#D4AF37] focus:outline-none transition-colors" />
                 </div>
                 <div>
                     <label className="text-xs uppercase tracking-widest text-gray-500 mb-2 block">И-мэйл</label>
                     <input type="email" className="w-full bg-black/50 border border-white/20 p-4 text-white focus:border-[#D4AF37] focus:outline-none transition-colors" />
                 </div>
                 <div>
                     <label className="text-xs uppercase tracking-widest text-gray-500 mb-2 block">Төслийн тухай</label>
                     <textarea rows="4" className="w-full bg-black/50 border border-white/20 p-4 text-white focus:border-[#D4AF37] focus:outline-none transition-colors"></textarea>
                 </div>
                 <button className="w-full bg-[#D4AF37] text-black font-bold uppercase py-4 hover:bg-white transition-colors">
                     Илгээх
                 </button>
             </form>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 text-center border-t border-white/5 text-gray-600 text-xs uppercase tracking-widest">
          &copy; 2025 ShogunAi Studio. All rights reserved.
      </footer>
    </div>
  );
};

export default ShogunStudio;