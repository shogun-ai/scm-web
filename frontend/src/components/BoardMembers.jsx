import React from 'react';

// ТУЗ-ын гишүүдийн мэдээлэл (Зургийн нэрсээ файлаа хуулсны дараа яг тааруулаарай)
const boardMembers = [
  {
    name: "Б.Дөлгөөн",
    role: "ТУЗ-ын дарга",
    experience: "Уул уурхай, олборлолтын салбарт 20 гаран жилийн ажлын туршлагатай.",
    image: "/board/dulguun.jpg" 
  },
  {
    name: "Б.Золбоо",
    role: "ТУЗ-ын гишүүн, Гүйцэтгэх захирал",
    experience: "Банк санхүүгийн салбарт 18 жилийн ажлын туршлагатай.",
    image: "/board/zolboo.jpg"
  },
  {
    name: "Ц.Отгонбилэг",
    role: "ТУЗ-ын гишүүн, Ерөнхий захирал",
    experience: "Банк санхүүгийн салбарт 23 жилийн ажлын туршлагатай.",
    image: "/board/otgonbileg.jpg"
  },
  {
    name: "В.Ганзориг",
    role: "ТУЗ-ын хараат бус гишүүн",
    experience: "Банк санхүү, маркетинг, медиа салбарт 22 жилийн туршлагатай.",
    image: "/board/ganzorig.jpg"
  },
  {
    name: "Д.Энхтүвшин",
    role: "ТУЗ-ын нарийн бичгийн дарга",
    experience: "Банк санхүү, эм ханган нийлүүлэлтийн салбарт 18 жилийн туршлагатай.",
    image: "/board/enkhtuvshin.jpg"
  }
];

const BoardMembers = () => {
  return (
    <section className="py-16 w-full bg-[#003B5C]/30 relative">
      {/* Арын бүдэг фон (Optional) */}
       <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center opacity-10 -z-10 mix-blend-overlay"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Гарчиг */}
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-white uppercase tracking-wide drop-shadow-md">
            Төлөөлөн Удирдах Зөвлөл
          </h2>
          <div className="mt-4 h-1 w-24 bg-[#D4AF37] mx-auto rounded-full leading-relaxed opacity-90"></div>
          <p className="text-blue-100 text-lg max-w-3xl mx-auto mt-6 font-sans font-light leading-relaxed opacity-90">
             Компанийн урт хугацааны тогтвортой хөгжил, засаглалын ил тод байдлыг ханган ажилладаг манай удирдлагын баг.
          </p>
        </div>

        {/* Гишүүдийн жагсаалт (Дугуй зурагтай) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 justify-items-center">
          {boardMembers.map((member, index) => (
            <div 
              key={index} 
              className="flex flex-col items-center text-center w-full max-w-xs group animate-fade-in-up"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Зургийн хэсэг - ДУГУЙ ХЭЛБЭРТЭЙ */}
              <div className="relative mb-6 inline-block">
                  {/* Алтан хүрээ ба сүүдэр */}
                  <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37] scale-105 opacity-70 group-hover:scale-110 group-hover:opacity-100 transition-all duration-500 shadow-[0_0_20px_rgba(212,175,55,0.3)]"></div>
                  
                  {/* Зураг */}
                  <div className="h-40 w-40 md:h-48 md:w-48 rounded-full overflow-hidden border-4 border-[#003B5C] bg-gray-700 relative z-10 group-hover:scale-105 transition-transform duration-500">
                    <img 
                        src={member.image} 
                        alt={member.name} 
                        className="w-full h-full object-cover object-center/top"
                        onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = 'https://via.placeholder.com/400x400?text=No+Image'
                        }}
                    />
                  </div>
              </div>

              {/* Мэдээллийн хэсэг */}
              <div className="space-y-3">
                  <h3 className="font-display font-bold text-2xl text-white group-hover:text-[#D4AF37] transition-colors duration-300 drop-shadow-md">
                    {member.name}
                  </h3>
                  <div className="flex flex-col items-center justify-center gap-1 min-h-[50px]">
                       <p className="text-[#D4AF37] font-sans font-semibold text-sm uppercase tracking-wider leading-tight px-4 py-1 rounded-full bg-[#003B5C]/60 border border-[#D4AF37]/30">
                        {member.role}
                      </p>
                      {member.subRole && (
                        <p className="text-blue-200 text-xs font-sans font-medium">
                          {member.subRole}
                        </p>
                      )}
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed font-sans font-light opacity-90 max-w-[260px] mx-auto border-t border-white/10 pt-3 mt-3">
                    {member.experience}
                  </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BoardMembers;