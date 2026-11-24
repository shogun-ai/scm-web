import { Globe, MessageCircle } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Tabs from '../ui/Tabs';
import CmsSafetySection from './cms/CmsSafetySection';
import CmsHeroSection from './cms/CmsHeroSection';
import CmsPromotionsSection from './cms/CmsPromotionsSection';
import CmsAboutSection from './cms/CmsAboutSection';
import CmsFinancialsSection from './cms/CmsFinancialsSection';
import CmsProductsSection from './cms/CmsProductsSection';
import CmsCalculatorSection from './cms/CmsCalculatorSection';
import CmsCeoSection from './cms/CmsCeoSection';
import CmsBoardSection from './cms/CmsBoardSection';
import CmsManagementSection from './cms/CmsManagementSection';
import CmsShareholderSection from './cms/CmsShareholderSection';
import CmsThemeSection from './cms/CmsThemeSection';
import ChatbotTab from './ChatbotTab';

// Sub-sections of "Контент засах". "Чатбот" is its own rail module (cmsSubTab === 'chatbot') and renders alone.
const SECTIONS = [
  { id: 'theme', label: 'Загвар ба өнгө' },
  { id: 'hero', label: 'Нүүр хуудас' },
  { id: 'safety', label: 'Сэрэмжлүүлэг' },
  { id: 'about', label: 'Бид хэн бэ?' },
  { id: 'financials', label: 'Санхүү' },
  { id: 'products', label: 'Бүтээгдэхүүн' },
  { id: 'calculator', label: 'Тооцоолуур' },
  { id: 'ceo', label: 'Захирлын мэндчилгээ' },
  { id: 'board', label: 'ТУЗ' },
  { id: 'management', label: 'Удирдлагын баг' },
  { id: 'shareholder', label: 'Хувьцаа эзэмшигч' },
  { id: 'promotions', label: 'Маркетинг slider' },
];

// Контент засах (amber) ба Чатбот (cyan) — Prism Sky. Both render directly on the sky; state and handlers arrive as props.
export default function CmsTab({ API_URL, PRODUCT_NAMES, addChatbotCard, addChatbotProductListItem, addMember, chatbotCards, cmsConfigStatus, cmsSaving, cmsSubTab, configEdits, createEmptyPromo, deleteMember, deletePromo, editingMember, editingProduct, editingPromo, facebookPosts, fetchCMSData, handleStatUpdate, newMember, newMemberType, products, promoSlides, removeChatbotCard, removeChatbotProductListItem, saveBulkConfig, saveChatbotSettings, saveFacebookPost, saveMember, savePromo, setCmsSaving, setCmsSubTab, setConfigEdits, setEditingMember, setEditingProduct, setEditingPromo, setNewMember, setNewMemberType, setProducts, setShowNewMember, showNewMember, siteConfig, stats, syncFacebookPosts, teamMembers, token, updateChatbotCard, updateChatbotProductList, updateFacebookPost, updatePromoWidget, uploadImage }) {
  if (cmsSubTab === 'chatbot') {
    return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': 'var(--sp-cyan)' }}>
      <PageHeader hue="cyan" icon={MessageCircle} eyebrow="Чатбот" title="Чатботын мэдээлэл" description="Холбоо барих мэдээлэл, тооцооллын хувь, бүтээгдэхүүний хариулт, бүрдүүлэх баримт" />
      <ChatbotTab PRODUCT_NAMES={PRODUCT_NAMES} addChatbotCard={addChatbotCard} addChatbotProductListItem={addChatbotProductListItem} chatbotCards={chatbotCards} cmsSaving={cmsSaving} configEdits={configEdits} facebookPosts={facebookPosts} products={products} removeChatbotCard={removeChatbotCard} removeChatbotProductListItem={removeChatbotProductListItem} saveChatbotSettings={saveChatbotSettings} saveFacebookPost={saveFacebookPost} setConfigEdits={setConfigEdits} setProducts={setProducts} siteConfig={siteConfig} syncFacebookPosts={syncFacebookPosts} updateChatbotCard={updateChatbotCard} updateChatbotProductList={updateChatbotProductList} updateFacebookPost={updateFacebookPost} uploadImage={uploadImage} />
    </div>;
  }

  const current = SECTIONS.find(section => section.id === cmsSubTab);
  return <div className="adm-board space-y-4 md:space-y-5" style={{ '--hue': 'var(--sp-amber)' }}>
    <PageHeader hue="amber" icon={Globe} eyebrow="Контент" title="Контент засах" description={current ? `Нийтийн сайт · ${current.label}` : 'Нийтийн scm.mn сайтын агуулга'} />
    <Tabs label="Контентын хэсэг" panelId="cms-panel" value={cmsSubTab} onChange={setCmsSubTab} items={SECTIONS} />

    <div id="cms-panel" role="tabpanel" aria-label={current?.label || 'Контент'} className="min-w-0">
      {cmsSubTab === 'safety' && <CmsSafetySection token={token} uploadImage={uploadImage} />}
      {cmsSubTab === 'hero' && <CmsHeroSection cmsSaving={cmsSaving} configEdits={configEdits} saveBulkConfig={saveBulkConfig} setConfigEdits={setConfigEdits} siteConfig={siteConfig} uploadImage={uploadImage} />}
      {cmsSubTab === 'promotions' && <CmsPromotionsSection cmsSaving={cmsSaving} createEmptyPromo={createEmptyPromo} deletePromo={deletePromo} editingPromo={editingPromo} promoSlides={promoSlides} savePromo={savePromo} setEditingPromo={setEditingPromo} updatePromoWidget={updatePromoWidget} uploadImage={uploadImage} />}
      {cmsSubTab === 'about' && <CmsAboutSection cmsSaving={cmsSaving} configEdits={configEdits} saveBulkConfig={saveBulkConfig} setConfigEdits={setConfigEdits} siteConfig={siteConfig} />}
      {cmsSubTab === 'financials' && <CmsFinancialsSection cmsSaving={cmsSaving} configEdits={configEdits} handleStatUpdate={handleStatUpdate} saveBulkConfig={saveBulkConfig} setConfigEdits={setConfigEdits} siteConfig={siteConfig} stats={stats} />}
      {cmsSubTab === 'products' && <CmsProductsSection API_URL={API_URL} cmsSaving={cmsSaving} editingProduct={editingProduct} fetchCMSData={fetchCMSData} products={products} setCmsSaving={setCmsSaving} setEditingProduct={setEditingProduct} uploadImage={uploadImage} />}
      {cmsSubTab === 'calculator' && <CmsCalculatorSection cmsConfigStatus={cmsConfigStatus} cmsSaving={cmsSaving} configEdits={configEdits} fetchCMSData={fetchCMSData} saveBulkConfig={saveBulkConfig} setConfigEdits={setConfigEdits} siteConfig={siteConfig} />}
      {cmsSubTab === 'ceo' && <CmsCeoSection cmsSaving={cmsSaving} configEdits={configEdits} saveBulkConfig={saveBulkConfig} setConfigEdits={setConfigEdits} siteConfig={siteConfig} uploadImage={uploadImage} />}
      {cmsSubTab === 'board' && <CmsBoardSection addMember={addMember} cmsSaving={cmsSaving} deleteMember={deleteMember} editingMember={editingMember} newMember={newMember} newMemberType={newMemberType} saveMember={saveMember} setEditingMember={setEditingMember} setNewMember={setNewMember} setNewMemberType={setNewMemberType} setShowNewMember={setShowNewMember} showNewMember={showNewMember} teamMembers={teamMembers} uploadImage={uploadImage} />}
      {cmsSubTab === 'management' && <CmsManagementSection addMember={addMember} cmsSaving={cmsSaving} deleteMember={deleteMember} editingMember={editingMember} newMember={newMember} newMemberType={newMemberType} saveMember={saveMember} setEditingMember={setEditingMember} setNewMember={setNewMember} setNewMemberType={setNewMemberType} setShowNewMember={setShowNewMember} showNewMember={showNewMember} teamMembers={teamMembers} uploadImage={uploadImage} />}
      {cmsSubTab === 'shareholder' && <CmsShareholderSection cmsSaving={cmsSaving} configEdits={configEdits} saveBulkConfig={saveBulkConfig} setConfigEdits={setConfigEdits} siteConfig={siteConfig} />}
      {cmsSubTab === 'theme' && <CmsThemeSection API_URL={API_URL} cmsSaving={cmsSaving} configEdits={configEdits} fetchCMSData={fetchCMSData} setCmsSaving={setCmsSaving} setConfigEdits={setConfigEdits} siteConfig={siteConfig} uploadImage={uploadImage} />}
    </div>
  </div>;
}
