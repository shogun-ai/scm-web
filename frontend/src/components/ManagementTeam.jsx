import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://scm-okjs.onrender.com';

const FALLBACK_MEMBERS = [
  { name: "Ц.Отгонбилэг", role: "Ерөнхий захирал", imagePath: "/board/otgonbileg.jpg" },
  { name: "Б.Золбоо", role: "Гүйцэтгэх захирал", imagePath: "/board/zolboo.jpg" }
];

const ManagementTeam = () => {
  const [members, setMembers] = useState(FALLBACK_MEMBERS);

  useEffect(() => {
    axios.get(`${API_URL}/api/team`)
      .then(res => { if (res.data?.length) setMembers(res.data); })
      .catch(() => {});
  }, []);

  return (
    <section className="py-16 w-full relative">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="flex flex-wrap justify-center gap-10 md:gap-16">
          {members.map((member, index) => (
            <div key={index} className="group relative w-full max-w-[300px] h-[380px] overflow-hidden rounded-2xl cursor-pointer shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/10">
              <img
                src={member.imagePath || member.image}
                alt={member.name}
                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/400x500?text=No+Image'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#003B5C] via-[#003B5C]/20 to-transparent opacity-90 transition-opacity duration-300"></div>
              <div className="absolute bottom-0 left-0 w-full p-8 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <div className="w-12 h-1 bg-[#D4AF37] mb-4 transition-all duration-300 group-hover:w-full"></div>
                <h3 className="font-display font-bold text-2xl text-white mb-2 drop-shadow-md">{member.name}</h3>
                <p className="text-[#D4AF37] font-sans text-sm font-bold uppercase tracking-wider border border-[#D4AF37]/30 inline-block px-3 py-1 rounded bg-[#003B5C]/60 backdrop-blur-sm">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ManagementTeam;
