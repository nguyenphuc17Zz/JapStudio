import React from 'react'
import type { MissionCategory, MissionTaxonomyAction, MissionTaxonomyCategory } from '../../../types/api'
import { Card, CardContent } from '../../ui/Card'
import { Icon, type IconName } from '../../icons/Icon'
import { Button } from '../../ui/Button'

interface MissionCategoryPickerProps {
  categories: MissionTaxonomyCategory[]
  actions: MissionTaxonomyAction[]
  selectedCategory: MissionCategory
  selectedAction: string
  onSelectCategory: (category: MissionCategory) => void
  onSelectAction: (actionType: string) => void
  onRandomSelect?: () => void
  disabled?: boolean
}

const CATEGORY_ICON_MAP: Record<string, IconName> = {
  daily_life: 'home',
  work: 'briefcase',
  services: 'shopping-bag',
  social: 'users',
  home: 'home',
  briefcase: 'briefcase',
  'shopping-bag': 'shopping-bag',
  users: 'users',
}

export const MissionCategoryPicker: React.FC<MissionCategoryPickerProps> = ({
  categories = [],
  actions = [],
  selectedCategory,
  selectedAction,
  onSelectCategory,
  onSelectAction,
  onRandomSelect,
  disabled = false,
}) => {
  const filteredActions = (actions || []).filter((a) => a.category === selectedCategory)

  return (
    <Card variant="default" className="mission-category-picker" style={{ overflow: 'hidden' }}>
      <CardContent style={{ padding: 'var(--space-md)' }}>
        {/* Step Indicator Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: 'var(--space-xs)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 'var(--text-micro)',
              }}
            >
              1
            </span>
            <h3
              style={{
                fontSize: 'var(--text-body)',
                fontWeight: 700,
                margin: 0,
                color: 'var(--color-foreground)',
              }}
            >
              Chọn Danh mục & Tình huống Giao tiếp
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ fontSize: 'var(--text-caption)', color: 'var(--color-foreground-muted)' }}>
              {categories.length} nhóm chủ đề • {actions.length} tình huống thực tế
            </span>
            {onRandomSelect && (
              <Button
                variant="secondary"
                size="sm"
                icon="refresh"
                onClick={onRandomSelect}
                disabled={disabled}
                style={{
                  fontSize: 'var(--text-micro)',
                  padding: '0 10px',
                  height: '28px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                🎲 Chọn Ngẫu nhiên
              </Button>
            )}
          </div>
        </div>

        {/* Category Cards (4 Big Cards) */}
        <div
          role="tablist"
          aria-label="Danh mục tình huống thực tế"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 'var(--space-sm)',
            marginBottom: 'var(--space-md)',
          }}
        >
          {categories.map((cat) => {
            const isSelected = cat.id === selectedCategory
            const iconName = CATEGORY_ICON_MAP[cat.id] || CATEGORY_ICON_MAP[cat.icon] || 'briefcase'

            return (
              <button
                key={cat.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => onSelectCategory(cat.id)}
                disabled={disabled}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-sm)',
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-lg)',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.18))'
                    : 'var(--color-surface)',
                  border: isSelected
                    ? '1.5px solid var(--color-primary)'
                    : '1px solid var(--color-border)',
                  color: isSelected ? 'var(--color-foreground)' : 'var(--color-foreground-secondary)',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSelected
                    ? '0 0 20px rgba(99, 102, 241, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.1)'
                    : 'none',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Icon Container with Glow */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected
                      ? 'linear-gradient(135deg, var(--color-primary), var(--color-accent))'
                      : 'var(--color-surface-subtle)',
                    color: isSelected ? '#ffffff' : 'var(--color-foreground-secondary)',
                    flexShrink: 0,
                    boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.4)' : 'none',
                  }}
                >
                  <Icon name={iconName} size={22} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 'var(--text-body-sm)',
                      color: isSelected ? 'var(--color-foreground)' : 'var(--color-foreground)',
                      marginBottom: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{cat.label_vi}</span>
                    {isSelected && (
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          background: 'var(--color-accent)',
                          boxShadow: '0 0 8px var(--color-accent)',
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-caption)',
                      color: isSelected ? 'var(--color-primary)' : 'var(--color-foreground-muted)',
                      fontWeight: 500,
                    }}
                  >
                    {cat.label_ja}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-foreground-muted)',
                      marginTop: '4px',
                    }}
                  >
                    {cat.action_count} tình huống
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Action Pills for Selected Category */}
        <div style={{ marginTop: 'var(--space-xs)' }}>
          <div
            style={{
              fontSize: 'var(--text-caption)',
              fontWeight: 600,
              color: 'var(--color-foreground-secondary)',
              marginBottom: 'var(--space-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              Chọn tình huống hành động ({filteredActions.length}):
            </span>
            <span style={{ fontSize: 'var(--text-micro)', color: 'var(--color-foreground-muted)' }}>
              Nhấp vào tình huống để chọn bối cảnh viết
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 'var(--space-xs)',
            }}
          >
            {filteredActions.map((action) => {
              const isSelected = action.action_type === selectedAction

              return (
                <button
                  key={action.action_type}
                  type="button"
                  onClick={() => onSelectAction(action.action_type)}
                  disabled={disabled}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(168, 85, 247, 0.22))'
                      : 'var(--color-surface-subtle)',
                    border: isSelected
                      ? '1.5px solid var(--color-primary)'
                      : '1px solid var(--color-border)',
                    color: isSelected ? 'var(--color-foreground)' : 'var(--color-foreground-secondary)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none',
                    minHeight: '68px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--text-body-sm)', color: 'var(--color-foreground)' }}>
                      {action.label_vi}
                    </span>
                    {isSelected && (
                      <span
                        style={{
                          color: 'var(--color-accent)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="check" size={14} />
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '6px',
                      fontSize: 'var(--text-micro)',
                      color: 'var(--color-foreground-muted)',
                    }}
                  >
                    <span style={{ fontStyle: 'normal', color: 'var(--color-primary)', fontWeight: 500 }}>
                      {action.label_ja}
                    </span>
                    <span
                      style={{
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--color-border)',
                        fontSize: '10px',
                      }}
                    >
                      {action.default_medium === 'email' ? '✉️ Email' : '💬 Chat'} • {action.recommended_jlpt.join('/')}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
