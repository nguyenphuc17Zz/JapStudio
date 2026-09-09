import { useState, type ReactNode } from 'react'
import { Page } from '../components/layout/Page'
import { PageHeader } from '../components/layout/PageHeader'
import { Brand } from '../components/layout/Brand'
import { TopBar } from '../components/layout/TopBar'
import { Breadcrumbs } from '../components/layout/Breadcrumbs'
import { PageContainer } from '../components/layout/PageContainer'
import { NavigationDrawer } from '../components/layout/NavigationDrawer'
import { ConnectionStatus } from '../components/layout/ConnectionStatus'
import { MobileBottomNav, MobileNavItem } from '../components/layout/MobileNav'
import { getLibraryDrawerItems } from '../navigation/config'
import { Section } from '../components/layout/Section'
import { Stack } from '../components/layout/Stack'
import { Inline } from '../components/layout/Inline'
import { Grid } from '../components/layout/Grid'
import { ContentContainer } from '../components/layout/ContentContainer'
import { SplitPane } from '../components/layout/SplitPane'
import { Sidebar, SidebarSection, SidebarItem, SidebarFooter, SidebarCollapseButton } from '../components/layout/Sidebar'
import { ThemeSwitcher } from '../components/layout/ThemeSwitcher'
import { Button } from '../components/ui/Button'
import { IconButton } from '../components/ui/IconButton'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'
import { Combobox } from '../components/ui/Combobox'
import { Checkbox } from '../components/ui/Checkbox'
import { Switch } from '../components/ui/Switch'
import { Radio } from '../components/ui/Radio'
import { Tabs } from '../components/ui/Tabs'
import { Badge } from '../components/ui/Badge'
import { Chip } from '../components/ui/Chip'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/Card'
import { Divider } from '../components/ui/Divider'
import { Tooltip } from '../components/ui/Tooltip'
import { Popover } from '../components/ui/Popover'
import { Dropdown } from '../components/ui/Dropdown'
import { Dialog } from '../components/ui/Dialog'
import { Drawer } from '../components/ui/Drawer'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { Alert } from '../components/ui/Alert'
import { ProgressBar, ProgressRing, ScoreRing, SkillBar, GoalProgress, XPProgress } from '../components/ui/Progress'
import { Score } from '../components/ui/Score'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Spinner } from '../components/ui/Spinner'
import { AIInsight } from '../components/ai/AIInsight'
import { AIRecommendation } from '../components/ai/AIRecommendation'
import { AIHint } from '../components/ai/AIHint'
import { AIStatus } from '../components/ai/AIStatus'
import { AIExplanation } from '../components/ai/AIExplanation'
import { AIReason } from '../components/ai/AIReason'
import { AIThinking } from '../components/ai/AIThinking'
import { AICoachMessage } from '../components/ai/AICoachMessage'
import { WritingEditorShell } from '../components/writing/WritingEditorShell'
import { CharacterCounter } from '../components/writing/CharacterCounter'
import { XpBadge, LevelUpBanner, StreakPill, LevelProgress } from '../components/gamification'
import { Icon, type IconName } from '../components/icons/Icon'

const swatchGroups: Array<{ title: string; swatches: Array<{ token: string; label: string }> }> = [
  {
    title: 'Bề mặt',
    swatches: [
      { token: '--color-bg', label: 'bg' },
      { token: '--color-surface', label: 'surface' },
      { token: '--color-surface-raised', label: 'raised' },
      { token: '--color-surface-overlay', label: 'overlay' },
      { token: '--color-surface-sunken', label: 'sunken' },
    ],
  },
  {
    title: 'Viền & chữ',
    swatches: [
      { token: '--color-border', label: 'border' },
      { token: '--color-border-strong', label: 'border-strong' },
      { token: '--color-foreground', label: 'text' },
      { token: '--color-foreground-muted', label: 'muted' },
      { token: '--color-foreground-subtle', label: 'subtle' },
      { token: '--color-foreground-inverse', label: 'inverse' },
    ],
  },
  {
    title: 'Accent & trạng thái',
    swatches: [
      { token: '--color-accent', label: 'accent' },
      { token: '--color-accent-hover', label: 'accent-hover' },
      { token: '--color-accent-soft', label: 'accent-soft' },
      { token: '--color-success', label: 'ok' },
      { token: '--color-warning', label: 'warn' },
      { token: '--color-danger', label: 'danger' },
      { token: '--color-info', label: 'info' },
    ],
  },
  {
    title: 'AI',
    swatches: [
      { token: '--color-ai', label: 'ai' },
      { token: '--color-ai-muted', label: 'ai-muted' },
      { token: '--color-ai-border', label: 'ai-border' },
      { token: '--color-ai-glow', label: 'ai-glow' },
    ],
  },
]

const iconNames: IconName[] = [
  'dashboard', 'practice', 'journey', 'write', 'challenge', 'simulation', 'vocabulary', 'history',
  'memory', 'settings', 'analytics', 'search', 'sun', 'moon', 'monitor', 'chevron-down', 'chevron-up',
  'chevron-left', 'chevron-right', 'x', 'check', 'plus', 'minus', 'sparkles', 'hint', 'flag', 'target',
  'trophy', 'flame', 'zap', 'clock', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'copy',
  'save', 'trash', 'edit', 'info', 'alert', 'help', 'eye', 'eye-off', 'lock', 'refresh', 'send',
  'quote', 'bookmark', 'trend-up', 'list', 'grid', 'collapse', 'menu', 'external', 'dots', 'language', 'star',
]

function Swatch({ token, label }: { token: string; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: 'var(--space-sm)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div
        style={{
          width: '100%',
          height: 48,
          borderRadius: 'var(--radius-md)',
          background: `var(${token})`,
          border: '1px solid var(--color-border)',
        }}
      />
      <code style={{ fontSize: 'var(--text-micro)' }}>{label}</code>
      <code style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>{token}</code>
    </div>
  )
}

function DemoBox({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div
      className="jw-card jw-card--subtle"
      style={{
        padding: 'var(--space-md)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 'var(--space-sm)',
      }}
    >
      <strong style={{ fontSize: 'var(--text-caption)' }}>{title}</strong>
      {children}
    </div>
  )
}

export default function DesignSystemPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [navDrawerOpen, setNavDrawerOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [splitCollapsed, setSplitCollapsed] = useState(false)
  const [writing, setWriting] = useState('今日はいい天気ですね。')
  const [tabValue, setTabValue] = useState('one')
  const [topic, setTopic] = useState('')
  const { success, error } = useToast()

  return (
    <Page>
      <ContentContainer>
        <PageHeader
          title="Design System"
          description="Hệ thống thiết kế Phase 1 — token, thành phần UI, AI, editor và layout. Trang này chỉ hiển thị khi chạy dev."
          actions={<ThemeSwitcher />}
        />

        {/* ---------- Typography ---------- */}
        <Section title="Typography" description="Thang đo chữ UI và tiếng Nhật.">
          <Grid cols={2} gap="lg">
            <DemoBox title="UI scale">
              <span style={{ fontSize: 'var(--text-hero)', fontWeight: 800 }}>Hero — 高</span>
              <span style={{ fontSize: 'var(--text-title)', fontWeight: 700 }}>Title — 高</span>
              <span style={{ fontSize: 'var(--text-subtitle)', fontWeight: 700 }}>Subtitle — 高</span>
              <span style={{ fontSize: 'var(--text-body)' }}>Body — 高</span>
              <span style={{ fontSize: 'var(--text-caption)' }}>Caption — 高</span>
              <span style={{ fontSize: 'var(--text-micro)' }}>Micro — 高</span>
            </DemoBox>
            <DemoBox title="Japanese scale">
              <span style={{ fontSize: 'var(--jp-hero)', fontFamily: 'var(--font-jp)', fontWeight: 700 }}>
                日本語の書き方
              </span>
              <span style={{ fontSize: 'var(--jp-title)', fontFamily: 'var(--font-jp)' }}>日本語の書き方</span>
              <span style={{ fontSize: 'var(--jp-body)', fontFamily: 'var(--font-jp)' }}>日本語の書き方</span>
              <span style={{ fontSize: 'var(--jp-caption)', fontFamily: 'var(--font-jp)' }}>日本語の書き方</span>
            </DemoBox>
          </Grid>
        </Section>

        {/* ---------- Colors ---------- */}
        <Section title="Màu sắc" description="Token màu theo chủ đề tối/sáng. Bật ThemeSwitcher ở góc phải để xem theme sáng.">
          <Stack gap="xl">
            {swatchGroups.map((group) => (
              <div key={group.title}>
                <h3 style={{ fontSize: 'var(--text-subtitle)', marginBottom: 8 }}>{group.title}</h3>
                <Grid cols={4} gap="md">
                  {group.swatches.map((swatch) => (
                    <Swatch key={swatch.token} {...swatch} />
                  ))}
                </Grid>
              </div>
            ))}
          </Stack>
        </Section>

        {/* ---------- Icons ---------- */}
        <Section title="Icons" description="~55 biểu tượng inline SVG, strokeWidth mặc định 1.5.">
          <Grid cols={4} gap="md">
            {iconNames.map((name) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: 'var(--space-sm)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <Icon name={name} size={18} />
                <code style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>{name}</code>
              </div>
            ))}
          </Grid>
        </Section>

        {/* ---------- Buttons & inputs ---------- */}
        <Section title="Buttons">
          <Inline gap="md" align="start">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive" icon="trash">Xóa</Button>
            <Button variant="link">Link</Button>
            <Button loading>Đang xử lý</Button>
            <Button disabled>Disabled</Button>
            <Button icon="sparkles">Gợi ý AI</Button>
            <Button size="sm" icon="check">Nhỏ</Button>
          </Inline>
          <Inline gap="md" align="start">
            <IconButton label="Xóa" icon="trash" />
            <IconButton label="Sửa" icon="edit" />
            <IconButton label="Tìm" icon="search" />
            <IconButton label="Đóng" icon="x" disabled />
          </Inline>
        </Section>

        <Section title="Form controls">
          <Grid cols={2} gap="lg">
            <Stack gap="md">
              <Input label="Email" placeholder="you@example.com" type="email" />
              <Input label="Mật khẩu" type="password" placeholder="••••••••" />
              <Input label="Có lỗi" defaultValue="sai định dạng" invalid error="Không hợp lệ" />
              <Input label="Bị khóa" disabled placeholder="Không thể sửa" />
              <Textarea label="Mô tả" placeholder="Viết gì đó…" rows={3} counter="42 / 120" />
              <Select label="Trình độ" defaultValue="n4">
                <option value="n5">N5 — Sơ cấp</option>
                <option value="n4">N4</option>
                <option value="n3">N3 — Trung cấp</option>
                <option value="n2">N2</option>
                <option value="n1">N1 — Cao cấp</option>
              </Select>
              <Combobox
                label="Chủ đề"
                placeholder="Chọn chủ đề…"
                value={topic}
                onChange={setTopic}
                options={[
                  { value: 'daily', label: 'Đời sống hằng ngày' },
                  { value: 'work', label: 'Công việc' },
                  { value: 'travel', label: 'Du lịch' },
                  { value: 'food', label: 'Ẩm thực' },
                  { value: 'culture', label: 'Văn hóa' },
                ]}
              />
            </Stack>
            <Stack gap="md">
              <Checkbox label="Nhận thông báo hằng ngày" defaultChecked />
              <Checkbox label="Đồng ý điều khoản" />
              <Switch label="Chế độ luyện tập nghiêm túc" defaultChecked />
              <Switch label="Thông báo" />
              <Radio name="ds-radio" label="Nhẹ nhàng" defaultChecked />
              <Radio name="ds-radio" label="Bình thường" />
              <Radio name="ds-radio" label="Căng thẳng" />
              <Badge tone="success">Đã hoàn thành</Badge>
              <Badge tone="warning">Còn thiếu</Badge>
              <Badge tone="error">Lỗi ngữ pháp</Badge>
              <Badge tone="info">Ghi chú</Badge>
              <Badge tone="ai">Gợi ý AI</Badge>
              <Inline gap="sm">
                <Chip selected>Ngữ pháp</Chip>
                <Chip>Từ vựng</Chip>
                <Chip icon="x">Có thể bỏ chọn</Chip>
              </Inline>
            </Stack>
          </Grid>
        </Section>

        {/* ---------- Tabs ---------- */}
        <Section title="Tabs">
          <Tabs
            value={tabValue}
            onChange={setTabValue}
            items={[
              { id: 'one', label: 'Tab một', content: 'Nội dung tab một.' },
              { id: 'two', label: 'Tab hai', content: 'Nội dung tab hai.' },
              { id: 'three', label: 'Tab ba', content: 'Nội dung tab ba.' },
            ]}
          />
        </Section>

        {/* ---------- Cards & overlay ---------- */}
        <Section title="Cards & overlay">
          <Grid cols={2} gap="lg">
            <Card>
              <CardHeader title="Thẻ cơ bản" description="Với tiêu đề và mô tả." />
              <CardContent>Nội dung thẻ. Dùng cho trang tổng quan, mục luyện tập…</CardContent>
              <CardFooter>
                <Button size="sm">Hành động</Button>
                <Button size="sm" variant="ghost">Hủy</Button>
              </CardFooter>
            </Card>
            <Card variant="ai">
              <CardHeader title="Thẻ AI" />
              <CardContent>Bề mặt riêng cho nội dung do AI sinh ra.</CardContent>
            </Card>
          </Grid>
          <Divider />
          <Inline gap="md">
            <Tooltip label="Đây là gợi ý">
              <Button variant="outline" icon="help">Hover tôi</Button>
            </Tooltip>
            <Popover trigger={<Button variant="outline" icon="settings">Popover</Button>}>
              Nội dung popover nhỏ gọn.
            </Popover>
            <Dropdown
              label="Menu"
              trigger={<Button variant="outline" icon="dots">Menu</Button>}
              items={[
                { id: 'edit', label: 'Sửa', icon: 'edit', onSelect: () => undefined },
                { id: 'copy', label: 'Sao chép', icon: 'copy', onSelect: () => undefined },
                { id: 'delete', label: 'Xóa', icon: 'trash', danger: true, onSelect: () => undefined },
              ]}
            />
            <Button variant="outline" icon="grid" onClick={() => setDialogOpen(true)}>Dialog</Button>
            <Button variant="outline" icon="menu" onClick={() => setDrawerOpen(true)}>Drawer</Button>
            <Button variant="outline" icon="trash" onClick={() => setConfirmOpen(true)}>Xác nhận</Button>
            <Button variant="outline" icon="check" onClick={() => success('Đã lưu bài viết')}>Toast</Button>
          </Inline>
        </Section>

        {/* ---------- Alerts ---------- */}
        <Section title="Alerts">
          <Stack gap="sm">
            <Alert tone="info" title="Thông tin">Đây là alert thông tin.</Alert>
            <Alert tone="success" title="Thành công">Đã lưu thành công.</Alert>
            <Alert tone="warning" title="Cảnh báo">Còn 3 phút cho bài viết.</Alert>
            <Alert tone="error" title="Lỗi">Không thể kết nối máy chủ.</Alert>
          </Stack>
        </Section>

        {/* ---------- Progress ---------- */}
        <Section title="Progress">
          <Grid cols={2} gap="lg">
            <Stack gap="md">
              <ProgressBar value={64} label="Tổng quan" showValue />
              <ProgressBar value={100} tone="success" size="sm" label="Mục tiêu ngày" />
              <ProgressBar value={38} tone="warning" size="lg" label="Sức bền" showValue />
              <ProgressBar value={80} tone="ai" label="Độ tự nhiên" showValue />
              <SkillBar label="Ngữ pháp" value={72} />
              <SkillBar label="Từ vựng" value={55} tone="success" />
              <GoalProgress label="Bài viết tuần này" value={3} target={5} />
              <XPProgress level={7} xp={340} xpInLevel={300} xpToNext={160} />
            </Stack>
            <Inline gap="xl" align="start">
              <ProgressRing value={72} label="72" caption="Ngữ pháp" />
              <ProgressRing value={45} tone="success" label="45" caption="Từ vựng" />
              <ProgressRing value={88} tone="warning" label="88" caption="Tự nhiên" />
              <ScoreRing value={82} caption="Điểm tổng" />
              <ScoreRing value={47} tone="error" caption="Mạch lạc" />
            </Inline>
          </Grid>
        </Section>

        <Section title="Score">
          <Inline gap="xl" align="start">
            <Score value={86} label="Tổng thể" trend={8} trendLabel="so với tuần trước" />
            <Score value={62} label="Ngữ pháp" trend={-4} confidence="medium" />
            <Score value={91} label="Độ tự nhiên" confidence="high" />
            <Score value={34} label="Mạch lạc" trend={0} confidence="low" confidenceLabel="Độ tin cậy thấp" />
          </Inline>
        </Section>

        {/* ---------- Loading, empty, error ---------- */}
        <Section title="Loading / Empty / Error">
          <Grid cols={2} gap="lg">
            <DemoBox title="Spinner">
              <Spinner label="Đang tải…" />
              <Spinner size={28} />
            </DemoBox>
            <DemoBox title="Skeleton">
              <Skeleton variant="text" lines={3} />
              <Skeleton variant="card" />
              <Skeleton variant="dashboard" />
            </DemoBox>
            <DemoBox title="Empty">
              <EmptyState title="Chưa có bài viết" description="Hãy viết bài đầu tiên để bắt đầu lộ trình." action={<Button size="sm" icon="write">Viết bài</Button>} />
            </DemoBox>
            <DemoBox title="Error">
              <ErrorState message="Không tải được dữ liệu lộ trình." code="E_1024" onRetry={() => undefined} />
            </DemoBox>
          </Grid>
        </Section>

        {/* ---------- AI ---------- */}
        <Section title="AI components">
          <Stack gap="lg">
            <AIInsight
              title="Nhận xét nhanh"
              description="Bài viết mạch lạc, nhưng nên dùng て-form nhiều hơn thay vì nối câu bằng そして."
              evidence={['2 lần lặp そして liên tiếp', '3 câu có thể ghép bằng て-form']}
              action={<Button size="sm" icon="hint">Xem ví dụ</Button>}
            />
            <AIRecommendation
              description="Bài tiếp theo nên tập trung vào kính ngữ (敬語) ở mức N3."
              meta={['N3', 'Business', 'Độ khó 6/10']}
              action={<Button size="sm" variant="secondary">Nhận bài đề xuất</Button>}
            />
            <AIHint hint="Thử dùng 〜そうです để diễn tả suy đoán." index={2} total={3} onMore={() => undefined} />
            <Inline gap="md">
              <AIStatus state="idle" />
              <AIStatus state="thinking" />
              <AIStatus state="done" label="Đã phân tích 3 tiêu chí" />
              <AIStatus state="error" label="Hết giờ, thử lại" />
            </Inline>
            <Inline gap="md" align="start">
              <AIExplanation title="Tại sao đây là lỗi?">
                <p style={{ margin: 0 }}>「は」đánh dấu chủ đề, còn 「が」nhấn mạnh chủ ngữ mới xuất hiện.</p>
              </AIExplanation>
              <AIReason>Đây là lỗi ngữ pháp phổ biến ở N4.</AIReason>
            </Inline>
            <AIThinking />
            <AICoachMessage role="ai" suggestions={['Giải thích thêm', 'Cho ví dụ khác']}>
              Bài viết của bạn khá tốt! Thử thêm một câu kết luận.
            </AICoachMessage>
            <AICoachMessage role="user">Cảm ơn! Tôi sẽ viết thêm kết luận.</AICoachMessage>
            <AICoachMessage role="ai" loading />
            <AICoachMessage role="ai" error="Không kết nối được AI. Vui lòng thử lại." />
          </Stack>
        </Section>

        {/* ---------- Gamification ---------- */}
        <Section title="Gamification" description="Huy hiệu XP, cấp bậc, chuỗi ngày luyện tập và thông báo thành tích.">
          <Stack gap="md">
            <Inline gap="md">
              <XpBadge xp={25} />
              <XpBadge xp={100} />
              <StreakPill streak={7} />
              <StreakPill streak={15} compact />
            </Inline>
            <LevelUpBanner level={5} />
            <div style={{ maxWidth: 300 }}>
              <LevelProgress
                level={4}
                currentXp={1250}
                xpInLevel={250}
                xpToNext={150}
              />
            </div>
          </Stack>
        </Section>

        {/* ---------- Writing ---------- */}
        <Section title="Writing editor">
          <WritingEditorShell
            value={writing}
            onChange={setWriting}
            toolbar={<CharacterCounter current={writing.length} targetMin={80} targetMax={120} />}
            footerRight={<Button size="sm" icon="send">Nộp bài</Button>}
          />
          <Inline gap="md">
            <CharacterCounter current={30} targetMin={80} targetMax={120} />
            <CharacterCounter current={95} targetMin={80} targetMax={120} />
            <CharacterCounter current={140} targetMin={80} targetMax={120} />
            <CharacterCounter current={42} />
          </Inline>
        </Section>

        {/* ---------- Shell ---------- */}
        <Section title="App shell" description="Sidebar, top bar, breadcrumbs, page container, drawer và bottom nav (Phase 2).">
          <Grid cols={2} gap="lg">
            <DemoBox title="Brand — mở rộng">
              <Brand />
            </DemoBox>
            <DemoBox title="Brand — thu gọn">
              <Brand collapsed />
            </DemoBox>
          </Grid>
          <DemoBox title="TopBar">
            <TopBar
              title="Bảng điều khiển"
              breadcrumb={<Breadcrumbs items={[{ label: 'Từ vựng', route: '/vocabulary' }, { label: 'Chi tiết' }]} />}
              actions={<ThemeSwitcher />}
            />
          </DemoBox>
          <DemoBox title="Breadcrumbs">
            <Breadcrumbs items={[{ label: 'Từ vựng', route: '/vocabulary' }, { label: 'Chi tiết' }]} />
          </DemoBox>
          <DemoBox title="PageHeader — eyebrow + breadcrumb">
            <PageHeader
              eyebrow="Hôm nay"
              breadcrumb={<Breadcrumbs items={[{ label: 'Luyện tập', route: '/practice' }, { label: 'Chi tiết' }]} />}
              title="Bài tập 12"
              description="Tình huống email trả lời khách hàng."
            />
          </DemoBox>
          <Grid cols={2} gap="lg">
            <DemoBox title="PageContainer compact">
              <PageContainer size="compact">Nội dung 720px</PageContainer>
            </DemoBox>
            <DemoBox title="PageContainer default">
              <PageContainer size="default">Nội dung 960px</PageContainer>
            </DemoBox>
          </Grid>
          <DemoBox title="NavigationDrawer (nội dung từ config)">
            <Button variant="outline" icon="menu" onClick={() => setNavDrawerOpen(true)}>
              Mở drawer điều hướng
            </Button>
          </DemoBox>
          <DemoBox title="MobileBottomNav">
            <MobileBottomNav>
              <MobileNavItem label="Trang chủ" icon="home" active />
              <MobileNavItem label="Luyện tập" icon="practice" />
              <MobileNavItem label="Lộ trình" icon="journey" />
              <MobileNavItem label="Thư viện" icon="vocabulary" />
              <MobileNavItem label="Thêm" icon="dots" />
            </MobileBottomNav>
          </DemoBox>
          <DemoBox title="ConnectionStatus">
            <ConnectionStatus degraded offlineMessage="Ngoại tuyến" degradedMessage="Một số dịch vụ đang gặp sự cố." />
          </DemoBox>
        </Section>

        {/* ---------- Layout ---------- */}
        <Section title="Layout primitives">
          <Stack gap="md">
            <ContentContainer size="md">
              <DemoBox title="ContentContainer md" />
            </ContentContainer>
            <SplitPane
              ratio={0.4}
              collapsible
              collapsed={splitCollapsed}
              onToggleCollapse={() => setSplitCollapsed((value) => !value)}
              left={<DemoBox title="Ngăn trái (0.4)" />}
              right={<DemoBox title="Ngăn phải" />}
            />
            <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
              <Sidebar
                brand="Sidebar mẫu"
                tagline="Phần layout thử nghiệm"
                style={{ width: sidebarCollapsed ? 64 : 240, transition: 'width 0.2s ease' }}
              >
                <SidebarSection title="Chính">
                  <SidebarItem label="Bảng điều khiển" icon="dashboard" active />
                  <SidebarItem label="Luyện tập" icon="practice" />
                  <SidebarItem label="Viết tự do" icon="write" />
                </SidebarSection>
                <SidebarFooter>
                  <SidebarCollapseButton collapsed={sidebarCollapsed} onClick={() => setSidebarCollapsed((value) => !value)} />
                </SidebarFooter>
              </Sidebar>
              <Stack gap="md" style={{ flex: 1 }}>
                <DemoBox title="Sidebar có thể thu gọn" />
                <DemoBox title="ThemeSwitcher dùng useTheme" />
              </Stack>
            </div>
          </Stack>
        </Section>
      </ContentContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Dialog mẫu"
        footer={<Button onClick={() => setDialogOpen(false)}>Đóng</Button>}
      >
        <p>Dialog có focus trap, Esc để đóng.</p>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        title="Xóa bài viết?"
        description="Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        destructive
        onConfirm={() => {
          setConfirmOpen(false)
          error('Đã xóa bài viết')
        }}
      />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Drawer mẫu"
        side="right"
        footer={<Button onClick={() => setDrawerOpen(false)}>Đóng</Button>}
      >
        <p>Drawer trượt từ phải, khóa cuộn nền.</p>
      </Drawer>

      <NavigationDrawer
        open={navDrawerOpen}
        onClose={() => setNavDrawerOpen(false)}
        title="Thư viện"
        items={getLibraryDrawerItems()}
        currentPath="/design-system"
      />
    </Page>
  )
}