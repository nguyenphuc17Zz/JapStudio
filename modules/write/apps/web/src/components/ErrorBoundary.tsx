import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './ui/ErrorState'

interface Props {
  children: ReactNode
  resetKey?: string
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    if (state.hasError && props.resetKey !== undefined && props.resetKey !== null) {
      return { hasError: false }
    }
    return null
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Đã xảy ra lỗi"
          message="Ứng dụng gặp sự cố không mong muốn. Bạn có thể thử lại hoặc quay về trang chủ."
          onRetry={() => this.setState({ hasError: false })}
          className="error-boundary"
        />
      )
    }
    return this.props.children
  }
}