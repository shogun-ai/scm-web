import TeamMembersEditor from './TeamMembersEditor';

// ТУЗ
export default function CmsBoardSection(props) {
  return <TeamMembersEditor {...props} memberType="board" title="Төлөөлөн удирдах зөвлөл" description="Нийтийн сайтын засаглалын хэсэгт харагдана." newTitle="Шинэ ТУЗ гишүүн"
    editFields={[{ f: 'name', l: 'Нэр' }, { f: 'role', l: 'Албан тушаал' }, { f: 'experience', l: 'Туршлага' }]}
    newFields={[{ f: 'name', l: 'Нэр' }, { f: 'role', l: 'Албан тушаал' }, { f: 'imagePath', l: 'Зургийн зам' }, { f: 'experience', l: 'Туршлага' }]} />;
}
