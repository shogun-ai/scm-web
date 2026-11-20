export const passwordPolicyError = (password) => {
  if (!password || password.length < 10) return 'Нууц үг хамгийн багадаа 10 тэмдэгт байна.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Нууц үг үсэг болон тоо агуулсан байх ёстой.';
  return '';
};

export const readInviteToken = () => {
  try { return new URLSearchParams(window.location.search).get('setPassword') || ''; } catch { return ''; }
};

export const stripInviteToken = () => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('setPassword');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch { /* ignore */ }
};

export const inviteResultText = (email, result) => {
  if (result === 'failed') return { ok: false, text: `Хэрэглэгч үүслээ, гэвч урилга ${email} руу илгээж чадсангүй. "Урилга дахин илгээх" товчийг ашиглана уу.` };
  if (result === 'skipped') return { ok: false, text: `Урилга ${email} руу илгээгдээгүй (имэйл тохируулаагүй байж болно).` };
  return { ok: true, text: `Урилга ${email} руу илгээгдлээ` };
};
