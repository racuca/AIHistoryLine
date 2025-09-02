import React, { useState, FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

interface TimelineEvent {
    year: number | string;
    title: string;
    description: string;
    details: string;
    link?: string;
}

const App: React.FC = () => {
    const [prompt, setPrompt] = useState<string>('조선시대 왕들을 순서대로 나열해줘');
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const fetchTimeline = async (userPrompt: string) => {
        setIsLoading(true);
        setError(null);
        setTimelineEvents([]);

        try {
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `다음 요청에 대한 역사적 사건 목록을 시간순으로 생성해줘: "${userPrompt}". 각 사건에 대해 연도, 제목, 간단한 설명(1-2문장), 그리고 상세한 설명을 포함해줘. 웹사이트를 참고했다면 링크도 포함해줘.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                year: { type: Type.STRING, description: "사건이 발생한 연도" },
                                title: { type: Type.STRING, description: "사건의 제목" },
                                description: { type: Type.STRING, description: "사건에 대한 1-2문장의 간단한 설명" },
                                details: { type: Type.STRING, description: "사건에 대한 상세 설명" },
                                link: { type: Type.STRING, description: "참고 웹사이트 주소 (선택 사항)" }
                            },
                            required: ["year", "title", "description", "details"]
                        }
                    }
                }
            });

            const jsonString = response.text.trim();
            const events: TimelineEvent[] = JSON.parse(jsonString);
            
            // Sort events by year, handling string years like "BC 108"
            const sortedEvents = events.sort((a, b) => {
                const yearA = String(a.year).includes('BC') ? -parseInt(String(a.year).replace(/\D/g, '')) : parseInt(String(a.year).replace(/\D/g, ''));
                const yearB = String(b.year).includes('BC') ? -parseInt(String(b.year).replace(/\D/g, '')) : parseInt(String(b.year).replace(/\D/g, ''));
                return yearA - yearB;
            });

            setTimelineEvents(sortedEvents);
        } catch (e: any) {
            console.error(e);
            setError("타임라인 정보를 가져오는 데 실패했습니다. 다시 시도해 주세요.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (prompt.trim()) {
            fetchTimeline(prompt);
        }
    };

    return (
        <>
            <h1>AI Historical Timeline</h1>
            <main className="timeline-container" role="feed" aria-busy={isLoading}>
                {isLoading ? (
                    <div className="status-container">
                        <div className="loader" role="status" aria-label="로딩 중"></div>
                        <p>타임라인 생성 중...</p>
                    </div>
                ) : error ? (
                    <div className="status-container">
                        <p className="error-message">{error}</p>
                    </div>
                ) : timelineEvents.length === 0 ? (
                    <div className="status-container">
                        <p>알고 싶은 역사적 사건이나 인물을 아래에 입력하고 '생성' 버튼을 눌러보세요.</p>
                    </div>
                ) : (
                    <>
                        <div className="timeline-line" aria-hidden="true"></div>
                        {timelineEvents.map((event, index) => (
                            <article key={index} className="timeline-item" onClick={() => setSelectedEvent(event)} tabIndex={0} role="button" aria-label={`${event.title} 상세 정보 보기`}>
                                <div className="timeline-content">
                                    <header className="timeline-header">
                                        <span className="timeline-year">{event.year}</span>
                                        <h2 className="timeline-title">{event.title}</h2>
                                    </header>
                                    <p className="timeline-description">{event.description}</p>
                                </div>
                            </article>
                        ))}
                    </>
                )}
            </main>
            <form onSubmit={handleSubmit} className="chat-form">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="chat-input"
                    placeholder="예: 조선시대 왕들, 세계 2차대전 주요 사건"
                    aria-label="역사적 주제 입력"
                    disabled={isLoading}
                />
                <button type="submit" className="chat-button" disabled={isLoading}>
                    {isLoading ? '생성 중...' : '생성'}
                </button>
            </form>
            
            {selectedEvent && (
                <div className="modal-overlay" onClick={() => setSelectedEvent(null)} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close-button" onClick={() => setSelectedEvent(null)} aria-label="닫기">&times;</button>
                        <header className="modal-header">
                            <h2 id="modal-title" className="modal-title">{selectedEvent.title}</h2>
                            <p className="modal-year">{selectedEvent.year}</p>
                        </header>
                        <p className="modal-details">{selectedEvent.details}</p>
                        {selectedEvent.link && (
                            <a href={selectedEvent.link} target="_blank" rel="noopener noreferrer" className="modal-link">
                                더 알아보기
                            </a>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
