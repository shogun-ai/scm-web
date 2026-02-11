import React, { useState } from 'react';
import { Link } from 'react-scroll';
import { FileText, BarChart3, Shield, Users, Phone, MapPin, Mail, ChevronRight } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('mission'); // About хэсгийн tab

  return (
    <div>
      {/* --- HEADER --- */}
      <header>
        <div class="nav-container">
          <div class="logo">Solongo Capital</div>
          <nav>
            <ul class="nav-links">
              <li><Link to="home" smooth={true} duration={500}>Нүүр</Link></li>
              <li><Link to="services" smooth={true} duration={500}>Үйлчилгээ</Link></li>
              <li><Link to="about" smooth={true} duration={500}>Бидний тухай</Link></li>
              <li><Link to="blog" smooth={true} duration={500}>Блог</Link></li>
              <li><Link to="contact" smooth={true} duration={500}>Холбоо барих</Link></li>
            </ul>
          </nav>
          <div style={{display: 'flex', gap: '10px'}}>
            <button class="btn btn-outline">Нэвтрэх</button>
            <button class="btn btn-rainbow">Хүсэлт илгээх</button>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section id="home" class="hero">
        <div>
          <h1 style={{fontSize: '3.5rem', marginBottom: '1rem'}}>Санхүүгийн Эрх Чөлөөг Танд Олгоно</h1>
          <p style={{fontSize: '1.2rem', marginBottom: '2rem'}}>Солонго Капитал ББСБ - Таны бизнесийн найдвартай түнш.</p>
          <Link to="services" smooth={true} duration={500} class="btn btn-rainbow">Үйлчилгээ үзэх</Link>
        </div>
      </section>

      {/* --- SERVICES SECTION --- */}
      <section id="services">
        <h2 class="section-title">Манай Үйлчилгээ</h2>
        <p style={{textAlign: 'center', marginBottom: '3rem'}}>Бид танд зах зээлийн хамгийн уян хатан нөхцөлийг санал болгож байна.</p>
        
        <div class="grid-cards">
          {[
            { title: "Бизнесийн Зээл", desc: "Эргэлтийн хөрөнгөө нэмэгдүүлж, бизнесээ өргөжүүлэх боломж.", icon: "💼" },
            { title: "Үл Хөдлөх Барьцаат", desc: "Орон сууц, үл хөдлөх барьцаалсан зээл.", icon: "🏠" },
            { title: "Авто Машины Зээл", desc: "Та машинаа унаж хэрэглэнгээ санхүүгийн асуудлаа шийдээрэй.", icon: "🚗" },
            { title: "Кредит карт", desc: "Санхүүгийн найдвартай нөөц, уян хатан төлөлт.", icon: "💳" },
            { title: "Итгэлцэл", desc: "Мөнгөн хөрөнгөө эрсдэлгүй, өндөр өгөөжтэй өсгөх боломж.", icon: "💰" }
          ].map((service, index) => (
            <div key={index} class="card">
              <div style={{fontSize: '2rem', marginBottom: '1rem'}}>{service.icon}</div>
              <h3 style={{marginBottom: '0.5rem', color: '#1e3a8a'}}>{service.title}</h3>
              <p>{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --- ABOUT US SECTION (Complex) --- */}
      <section id="about" style={{background: '#fff'}}>
        <h2 class="section-title">Бидний тухай</h2>
        <p style={{maxWidth: '800px', margin: '0 auto 3rem auto', textAlign: 'center'}}>
          Солонго Капитал ББСБ нь 2020 онд байгуулагдсан цагаасаа эхлэн харилцагчдынхаа итгэлийг дааж, санхүүгийн цогц үйлчилгээг мэргэжлийн өндөр түвшинд үзүүлж ирсэн.
        </p>

        {/* Давуу талууд */}
        <div style={{display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '4rem', flexWrap: 'wrap'}}>
          {['Шуурхай шийдвэрлэлт', 'Уян хатан нөхцөл', 'Мэргэжлийн баг хамт олон'].map(item => (
            <div style={{background: '#f3f4f6', padding: '1rem 2rem', borderRadius: '50px', fontWeight: 'bold', color: '#1e3a8a'}}>
              ✓ {item}
            </div>
          ))}
        </div>

        {/* Tabs for Mission, Financials, Reports */}
        <div style={{display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap'}}>
          {['mission', 'financials', 'reports', 'governance'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              class={`btn ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`}
              style={{textTransform: 'uppercase'}}
            >
              {tab === 'mission' ? 'Зорилго & Үнэт зүйлс' : 
               tab === 'financials' ? 'Санхүүгийн үзүүлэлт' : 
               tab === 'reports' ? 'Тайлан' : 'Засаглал'}
            </button>
          ))}
        </div>

        <div style={{background: '#f8fafc', padding: '2rem', borderRadius: '1rem', minHeight: '300px'}}>
          {/* CONTENT: Mission & Vision */}
          {activeTab === 'mission' && (
            <div class="grid-cards">
              <div class="card">
                <h3>Эрхэм зорилго</h3>
                <p>Харилцагчдын санхүүгийн хэрэгцээг шуурхай, уян хатан, найдвартай шийдлээр хангаж, тэдний бизнес ба амьдралын тогтвортой өсөлтийг дэмжих.</p>
              </div>
              <div class="card">
                <h3>Алсын хараа</h3>
                <p>Монголын санхүүгийн зах зээлд итгэлд суурилсан, дижитал, хэрэглэгч төвтэй санхүүгийн байгууллага болох.</p>
              </div>
              <div class="card">
                <h3>Үнэт зүйлс</h3>
                <ul style={{marginTop: '10px'}}>
                  <li>🔹 Итгэл ба ил тод байдал</li>
                  <li>🔹 Харилцагч төвтэй шийдэл</li>
                  <li>🔹 Мэргэжлийн ёс зүй</li>
                  <li>🔹 Шуурхай, үр дүнтэй байдал</li>
                </ul>
              </div>
            </div>
          )}

          {/* CONTENT: Financial Indicators */}
          {activeTab === 'financials' && (
            <div style={{textAlign: 'center'}}>
              <h3>Санхүүгийн гол үзүүлэлтүүд</h3>
              <p style={{marginBottom: '2rem'}}>2024 оны 4-р улирлын байдлаар</p>
              <div class="grid-cards">
                 <div class="card"><h2>100 тэрбум ₮</h2><p>Нийт хөрөнгө</p></div>
                 <div class="card"><h2>15% ↗</h2><p>Зээлийн багцын өсөлт</p></div>
                 <div class="card"><h2>18%</h2><p>Өөрийн хөрөнгийн өгөөж (ROE)</p></div>
              </div>
            </div>
          )}

          {/* CONTENT: Reports (PDF Preview Simulation) */}
          {activeTab === 'reports' && (
            <div>
               <h3>Санхүүгийн тайлангууд</h3>
               <div class="grid-cards">
                 <div class="card">
                   <div class="report-preview"><FileText size={40}/> PDF Preview</div>
                   <h4>2024 оны Жилийн тайлан</h4>
                   <button class="btn btn-outline" style={{marginTop: '10px', width: '100%'}}>Татах</button>
                 </div>
                 <div class="card">
                   <div class="report-preview"><BarChart3 size={40}/> Table View</div>
                   <h4>Улирлын тайлан (Хүснэгт)</h4>
                   <button class="btn btn-outline" style={{marginTop: '10px', width: '100%'}}>Харах</button>
                 </div>
               </div>
            </div>
          )}

          {/* CONTENT: Governance */}
          {activeTab === 'governance' && (
            <div>
               <h3>Компанийн засаглал</h3>
               <p style={{marginBottom: '20px'}}>Бид хариуцлагатай, ил тод засаглалын зарчмыг баримталдаг.</p>
               <div class="grid-cards">
                 <div class="card">
                   <Shield size={32} style={{color: '#1e3a8a', marginBottom: '10px'}}/>
                   <h4>Ёс зүйн дүрэм</h4>
                   <div class="report-preview" style={{height: '100px', marginTop: '10px'}}>PDF Preview</div>
                 </div>
                 <div class="card">
                   <Users size={32} style={{color: '#1e3a8a', marginBottom: '10px'}}/>
                   <h4>Удирдлагын бүтэц</h4>
                   <div class="report-preview" style={{height: '100px', marginTop: '10px'}}>Structure Chart</div>
                 </div>
               </div>
            </div>
          )}
        </div>
      </section>

      {/* --- BLOG SECTION --- */}
      <section id="blog">
        <h2 class="section-title">Мэдээ & Мэдээлэл</h2>
        <div class="grid-cards">
          {[1, 2, 3].map(item => (
            <div key={item} class="card" style={{padding: '0', overflow: 'hidden'}}>
              <div style={{height: '200px', background: '#ccc'}}>
                {/* Image Placeholder */}
                <img src={`https://source.unsplash.com/random/400x200?finance,${item}`} alt="Blog" style={{width: '100%', height: '100%', objectFit: 'cover'}}/>
              </div>
              <div style={{padding: '1.5rem'}}>
                <span style={{color: '#f59e0b', fontSize: '0.8rem', fontWeight: 'bold'}}>ШИНЭ МЭДЭЭ</span>
                <h3 style={{margin: '10px 0'}}>ББСБ-ийн шинэ бүтээгдэхүүн зах зээлд гарлаа</h3>
                <p style={{fontSize: '0.9rem', color: '#666'}}>Харилцагч та бүхэндээ зориулан...</p>
                <a href="#" style={{color: '#1e3a8a', fontWeight: 'bold', marginTop: '10px', display: 'inline-block'}}>Дэлгэрэнгүй &rarr;</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- CONTACT SECTION --- */}
      <section id="contact" style={{background: '#111827', color: 'white'}}>
        <div style={{maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '3rem'}}>
          <div style={{flex: 1, minWidth: '300px'}}>
             <h2 style={{fontSize: '2.5rem', marginBottom: '2rem'}}>Холбоо барих</h2>
             <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
               <div style={{display: 'flex', gap: '1rem'}}>
                 <Phone color="#f59e0b" />
                 <div>
                   <h4 style={{marginBottom: '5px'}}>Утас</h4>
                   <p>7519 1919, 7519 9191</p>
                 </div>
               </div>
               <div style={{display: 'flex', gap: '1rem'}}>
                 <Mail color="#f59e0b" />
                 <div>
                   <h4 style={{marginBottom: '5px'}}>И-мэйл</h4>
                   <p>info@scm.mn</p>
                 </div>
               </div>
               <div style={{display: 'flex', gap: '1rem'}}>
                 <MapPin color="#f59e0b" />
                 <div>
                   <h4 style={{marginBottom: '5px'}}>Хаяг</h4>
                   <p>Улаанбаатар, Хан-Уул дүүрэг, 20-р хороо, Мишээл Оффис Төв М3 цамхаг, 12 давхар, 1207 тоот.</p>
                 </div>
               </div>
             </div>
          </div>
          
          <div style={{flex: 1, minWidth: '300px', height: '400px', background: '#333', borderRadius: '1rem', overflow: 'hidden'}}>
            {/* Google Map Placeholder - Embed code-г дараа жинхэнэ болгоно */}
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2673.1234!2d106.905!3d47.900!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDfCsDU0JzAwLjAiTiAxMDbCsDU0JzE4LjAiRQ!5e0!3m2!1sen!2smn!4v1620000000000!5m2!1sen!2smn" 
              width="100%" 
              height="100%" 
              style={{border:0}} 
              allowFullScreen="" 
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer>
        <div class="footer-grid">
           <div>
             <h3 style={{marginBottom: '1rem'}}>SOLONGO CAPITAL</h3>
             <p style={{color: '#9ca3af'}}>Таны санхүүгийн эрх чөлөө.</p>
           </div>
           <div>
             <h4>Цэс</h4>
             <ul style={{color: '#9ca3af', marginTop: '10px'}}>
               <li>Нүүр</li>
               <li>Үйлчилгээ</li>
               <li>Блог</li>
             </ul>
           </div>
           <div>
             <h4>Тусламж</h4>
             <ul style={{color: '#9ca3af', marginTop: '10px'}}>
               <li>Түгээмэл асуулт</li>
               <li>Нууцлалын бодлого</li>
             </ul>
           </div>
        </div>
        <div style={{textAlign: 'center', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #374151', color: '#6b7280'}}>
          &copy; 2024 Solongo Capital NBFI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

export default App;