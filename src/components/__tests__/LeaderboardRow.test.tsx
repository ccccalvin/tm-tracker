import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LeaderboardRow } from '@/components/leaderboard/LeaderboardTable';
import { StatStrip } from '@/components/StatStrip';
import type { ClassInfo, LeaderboardEntry } from '@/types';

const classMap = new Map<string, ClassInfo>([
  ['mon-advn', { id: 'mon-advn', name: "Calvin's Monday ADVN", badge: 'MON ADVN', archived: false, order: 0 }],
]);

function entry(over: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    uid: 'u1',
    displayName: 'Alice',
    classId: 'mon-advn',
    paperCount: 37,
    lastCompletedAt: null,
    rank: 1,
    isYou: false,
    ...over,
  };
}

describe('LeaderboardRow', () => {
  it('renders rank, name, class badge and paper count', () => {
    const { getByText } = render(<LeaderboardRow entry={entry()} classMap={classMap} />);
    expect(getByText('1')).toBeInTheDocument();
    expect(getByText('Alice')).toBeInTheDocument();
    expect(getByText('MON ADVN')).toBeInTheDocument();
    expect(getByText('37 papers')).toBeInTheDocument();
  });

  it('applies the gold tint to rank 1 by default', () => {
    const { container } = render(<LeaderboardRow entry={entry({ rank: 1 })} classMap={classMap} />);
    expect(container.querySelector('.row-gold')).not.toBeNull();
  });

  it('omits the medal tint when medal={false} (the standalone You row)', () => {
    const { container } = render(
      <LeaderboardRow entry={entry({ rank: 1 })} classMap={classMap} medal={false} />,
    );
    expect(container.querySelector('.row-gold')).toBeNull();
  });
});

describe('StatStrip', () => {
  it('renders the three stats', () => {
    const { getByText } = render(
      <StatStrip stats={{ total: 37, average: 78, thisWeek: 4 }} />,
    );
    expect(getByText('37')).toBeInTheDocument();
    expect(getByText('78%')).toBeInTheDocument();
    expect(getByText('+4')).toBeInTheDocument();
  });

  it('shows an em dash for a null average', () => {
    const { getByText } = render(
      <StatStrip stats={{ total: 0, average: null, thisWeek: 0 }} />,
    );
    expect(getByText('—')).toBeInTheDocument();
  });
});
