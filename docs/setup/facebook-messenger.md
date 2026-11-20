# Facebook Messenger (Solongo.Capital) — тохиргооны заавар

Бизнесийн эзэмшигч Meta талд хийх алхмууд. Page руу пост **нийтлэх/үүсгэх** функц системд байхгүй: зөвхөн page-ийн одоо байгаа постыг уншиж, Messenger хариу илгээнэ.

## 0. Ойлголт (D18.2)

- Solongo.Capital page нь AutoMarket Mongolia (Zentro)-той **ижил Meta app** дээр нэмэгдэнэ. Meta app-д зөвхөн **нэг** Messenger webhook callback URL байдаг тул одоо байгаа Zentro callback ашиглагдана:
  `https://<API хаяг>/api/zentro/facebook/webhook`
- Backend webhook-оос ирсэн `entry.id`-аар page-үүдийг салгана: Zentro page → Zentro, Solongo.Capital → SCM Messenger. (Холболтын статусыг `docs/design/loan-task-management.md` §18.2-оос харна; forwarder холбогдсон байх ёстой.)
- Хуучин шууд замыг (`/api/messenger/webhook`) мөн ашиглаж болно (тусдаа app-тай бол).

## 1. Page-ийг Meta app-д холбох

1. https://developers.facebook.com → My Apps → Zentro-ийн app-ыг нээнэ.
2. **Messenger → Messenger API Settings → Generate access tokens → Add or remove Pages** дарж **Solongo.Capital** page-ийг нэмнэ (page-ийн admin эрхтэй Facebook хаягаар нэвтэрсэн байх ёстой).
3. Нэмсний дараа Solongo.Capital мөрөнд **Generate token** дарж **SCM page token**-ыг үүсгэнэ. Token-ыг нэг л удаа харуулдаг тул шууд хадгална.

## 2. Page token-ийн эрх (scope)

App-ын **App Review → Permissions and Features**-д дараах эрх Advanced access (эсвэл app admin/tester бол Standard) байх ёстой:

| Эрх | Зориулалт |
|---|---|
| `pages_messaging` | Харилцагчид хариу илгээх |
| `pages_manage_metadata` | Webhook-д page-ийг subscribe хийх, `subscribed_apps` унших |
| `pages_show_list` | Page-ийн жагсаалт/token |
| `pages_read_engagement` | Page-ийн постыг унших (`/me/posts`) — read-only |

Анхаар: **`pages_manage_posts` эрх ӨГӨХГҮЙ.** Системд пост нийтлэх код байхгүй, энэ эрхийг өгөх шаардлагагүй.

Token нь **хугацаагүй (long-lived page token)** байх ёстой: Graph API Explorer-т эсвэл дээрх Generate token-оор авсан page token нь хугацаагүй. Хугацаатай (user) token бүү ашигла.

## 3. Webhook талбарууд

Messenger → Messenger API Settings → **Webhooks** (Configure webhooks):

- Callback URL: `https://<API хаяг>/api/zentro/facebook/webhook` (одоо байгаа хэвээр, өөрчлөхгүй)
- Verify token: Zentro-д ашиглаж байгаа `ZENTRO_FB_VERIFY_TOKEN`-ийн утга (хэвээр)
- **Add subscriptions** дээр Solongo.Capital page-ийн хувьд дараахыг идэвхжүүлнэ:
  - `messages`
  - `messaging_postbacks`
  - `messaging_optins`
- Page-ийг app-д subscribe хийснийг шалгах: Webhooks хэсэгт Solongo.Capital мөрөнд "Subscribed" харагдана. Эсвэл админ панелийн "Facebook холболт" хэсэгт `webhook` ✓ байх.

## 4. Серверийн орчны хувьсагчууд (Render)

| Хувьсагч | Утга |
|---|---|
| `FB_PAGE_ACCESS_TOKEN` | 1-р алхмаар авсан **SCM page token** |
| `FB_VERIFY_TOKEN` | Өөрөө сонгосон нууц тэмдэгт мөр (шууд `/api/messenger/webhook` ашиглах үед) |
| `FB_APP_SECRET` | Meta app-ын **App secret** — Zentro-ийн `ZENTRO_META_APP_SECRET`-тэй **яг ижил утга** |
| `FB_EXPECTED_PAGE` | (заавал биш) default `Solongo.Capital` |
| `FB_GRAPH_VERSION` | (заавал биш) default `v20.0` |
| `ZENTRO_FB_PAGE_ID` | Zentro page-ийн ID (хэвээр; SCM handler энэ page-ийг хэзээ ч боловсруулахгүй) |
| `LOAN_TASKS_ENABLED` | `true` — үгүй бол Messenger доторх хүсэлт бүртгэгдэхгүй, харилцагчид сайт руу чиглүүлнэ |

Token, secret-ийг кодонд, чатад бичихгүй; зөвхөн Render-ийн Environment хэсэгт оруулна. Хувьсагч өөрчилсний дараа сервис дахин ачаалагдана.

## 5. Шалгах

1. Админ панел → Тохиргоо → **Facebook холболт**: page нэр, "Solongo.Capital мөн" ✓, webhook ✓, app secret ✓.
2. **Messenger цэсийг дахин тохируулах** товч (эсвэл сервис дахин ачаалахад автоматаар): цэс = Зээлийн хүсэлт (вэб), Сүүлийн мэдээ, Үндсэн цэс, Холбоо барих.
3. Solongo.Capital page руу өөр Facebook хаягаар (app-ын tester/admin) "Сүүлийн мэдээ" гэж бичиж carousel ирэхийг, "Зээлийн хүсэлт" гэж бичиж алхам алхмаар асуулт ирэхийг шалгана.
4. Хүсэлт баталгаажуулахад админ хэсгийн **Хүсэлтүүд** дээр "Messenger" тэмдэгтэй шинэ мөр гарна; харилцагчид `SCM-YYYY-XXXXXX` дугаар очно.

## 6. App Live горим

App **Development** горимд зөвхөн app-ын admin/developer/tester ажиллана. Бодит хэрэглэгчдэд нээхийн тулд app-ыг **Live** болгож, дээрх эрхүүдэд App Review (Advanced access) хийлгэнэ. Review-д: page-ийн нэр, Messenger-ийн хэрэглээ (зээлийн лавлагаа, хүсэлт), privacy policy URL шаардана.

## 7. Token солих

Token алдагдсан/дууссан бол: Meta app → Messenger API Settings → Generate token (Solongo.Capital) → Render дахь `FB_PAGE_ACCESS_TOKEN`-г шинэчилнэ → Админ панелийн "Facebook холболт"-ыг дахин шалгана. Хуучин token-ыг Meta талд хүчингүй болгоно.

## 8. Meta Pixel

Админ панел → Тохиргоо → Pixel ID талбарт Events Manager-ийн Pixel ID (10–20 оронтой тоо) оруулна. Хоосон хадгалбал Pixel унтарна.
