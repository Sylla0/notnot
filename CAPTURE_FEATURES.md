# NotNot 캡처 기능 업데이트 🎯

## 새로운 기능들

### 1. **캡처 영역 기억** 📌
- 첫 번째 캡처 시 선택한 영역을 자동으로 기억
- 이후 캡처는 같은 영역을 자동으로 사용
- 설정에서 "Remember capture area" 옵션으로 켜고 끌 수 있음

### 2. **캡처 단축키** ⌨️
- 기본값: **Alt+S**
- 비디오를 보면서 빠르게 캡처 가능
- 설정에서 원하는 단축키로 변경 가능
  - 예: Ctrl+Shift+C, Alt+Shift+X 등

### 3. **영역 초기화** 🔄
- 캡처 버튼을 **1초간 길게 누르면** 저장된 영역 초기화
- 새로운 영역을 선택할 수 있음
- 토스트 메시지로 알림: "캡처 영역이 초기화되었습니다"

## 사용 방법

### 기본 사용법
1. **첫 캡처**: 캡처 버튼 클릭 → 영역 드래그 선택
2. **이후 캡처**: 캡처 버튼 클릭 또는 Alt+S → 자동으로 같은 영역 캡처
3. **영역 변경**: 캡처 버튼 1초 길게 누르기 → 새 영역 선택

### 설정 변경
1. NotNot 아이콘 우클릭 → "옵션"
2. **Capture Settings** 섹션에서:
   - **Capture keyboard shortcut**: 원하는 단축키 입력
   - **Remember capture area**: 영역 기억 기능 켜기/끄기

### 단축키 예시
- `Alt+S` - 기본값
- `Ctrl+Shift+C` - 컨트롤+시프트+C
- `Alt+Shift+X` - 알트+시프트+X
- `Ctrl+Alt+S` - 컨트롤+알트+S

## 기술적 세부사항

### 설정 저장
- Chrome Storage Sync API 사용
- 모든 기기에서 동기화됨
- 실시간 설정 변경 반영

### 영역 기억 로직
```javascript
// Remember capture area if setting is on
if (this.sidebar.rememberCaptureArea) {
  this.sidebar.lastCaptureArea = selection;
}

// Use saved area on next capture
if (this.sidebar.lastCaptureArea && this.sidebar.rememberCaptureArea) {
  await this.performCapture(this.sidebar.lastCaptureArea);
}
```

### 단축키 처리
- Document 레벨에서 키보드 이벤트 감지
- YouTube 단축키와 충돌 방지
- 노트 편집 중에도 작동

## 팁과 트릭

1. **강의 영상 캡처**: 슬라이드 영역만 선택해서 효율적으로 캡처
2. **코드 캡처**: 코드 에디터 부분만 선택해서 깔끔하게 캡처
3. **빠른 캡처**: Alt+S로 순간적인 장면도 놓치지 않고 캡처

## 문제 해결

- **단축키가 작동하지 않음**: 
  - 노트 편집기에 포커스가 있는지 확인
  - 설정에서 단축키가 올바르게 입력되었는지 확인
  
- **영역이 초기화되지 않음**:
  - 1초 이상 충분히 길게 누르기
  - 마우스가 버튼 위에서 벗어나지 않도록 주의

- **설정이 저장되지 않음**:
  - "Save Settings" 버튼 클릭
  - Chrome 동기화가 활성화되어 있는지 확인