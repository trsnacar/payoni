import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-xl font-semibold text-gray-900">Beklenmeyen bir hata oluştu</h1>
            <p className="text-sm text-gray-500">
              {this.state.error?.message || 'Bilinmeyen hata'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-primary"
            >
              Tekrar Dene
            </button>
            <p className="text-xs text-gray-400">
              Sorun devam ederse sayfayı yenileyiniz.
            </p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
