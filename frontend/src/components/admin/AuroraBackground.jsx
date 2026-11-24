// Twilight sky with a slowly drifting aurora / prism light field.
// Transform-only animation on pre-blurred radial gradients (no per-frame filters).
export default function AuroraBackground() {
  return <div className="adm-aurora no-print" aria-hidden="true">
    <div className="adm-aurora__band adm-aurora__band--a" />
    <div className="adm-aurora__band adm-aurora__band--b" />
    <div className="adm-aurora__band adm-aurora__band--c" />
    <div className="adm-aurora__band adm-aurora__band--d" />
    <div className="adm-aurora__prism" />
    <div className="adm-aurora__grid" />
    <div className="adm-aurora__grain" />
  </div>;
}
