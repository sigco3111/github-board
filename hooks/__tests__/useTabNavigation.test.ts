import { renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useTabNavigation } from '../useTabNavigation';

// Mock react-router-dom
const mockNavigate = jest.fn();
const mockUseParams = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams(),
}));

describe('useTabNavigation', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseParams.mockClear();
  });

  it('should return overview as default tab when no tab parameter is provided', () => {
    mockUseParams.mockReturnValue({ tab: undefined });
    
    const { result } = renderHook(() => useTabNavigation('testuser'), {
      wrapper: BrowserRouter,
    });

    expect(result.current.activeTab).toBe('overview');
  });

  it('should return correct tab when tab parameter is provided', () => {
    mockUseParams.mockReturnValue({ tab: 'repositories' });
    
    const { result } = renderHook(() => useTabNavigation('testuser'), {
      wrapper: BrowserRouter,
    });

    expect(result.current.activeTab).toBe('repositories');
  });

  it('should navigate to username only for overview tab', () => {
    mockUseParams.mockReturnValue({ tab: undefined });
    
    const { result } = renderHook(() => useTabNavigation('testuser'), {
      wrapper: BrowserRouter,
    });

    result.current.navigateToTab('overview');
    expect(mockNavigate).toHaveBeenCalledWith('/testuser');
  });

  it('should navigate to username/tab for non-overview tabs', () => {
    mockUseParams.mockReturnValue({ tab: undefined });
    
    const { result } = renderHook(() => useTabNavigation('testuser'), {
      wrapper: BrowserRouter,
    });

    result.current.navigateToTab('repositories');
    expect(mockNavigate).toHaveBeenCalledWith('/testuser/repositories');
  });
});