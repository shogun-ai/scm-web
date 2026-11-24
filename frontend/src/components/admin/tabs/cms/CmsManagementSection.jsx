import TeamMembersEditor from './TeamMembersEditor';

// Удирдлагын баг
export default function CmsManagementSection(props) {
  return <TeamMembersEditor {...props} memberType="management" title="Удирдлагын баг" description="Нийтийн сайтын засаглалын хэсэгт харагдана." newTitle="Шинэ удирдлагын гишүүн"
    editFields={[{ f: 'name', l: 'Нэр' }, { f: 'role', l: 'Албан тушаал' }]}
    newFields={[{ f: 'name', l: 'Нэр' }, { f: 'role', l: 'Албан тушаал' }, { f: 'imagePath', l: 'Зургийн зам' }]} />;
}
