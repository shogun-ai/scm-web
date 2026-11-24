import GlassSheet from '../../theme/GlassSheet';
import SafetyNoticesAdmin from '../../../SafetyNoticesAdmin';

// Аюулгүй байдлын мэдээлэл. SafetyNoticesAdmin is a shared light component, so it keeps its own
// palette inside a pearl sheet on the sky (amber edge light).
export default function CmsSafetySection({ token, uploadImage }) {
  return <GlassSheet hue="amber">
    <SafetyNoticesAdmin token={token} uploadImage={uploadImage} />
  </GlassSheet>;
}
