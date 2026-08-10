import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable, type DataTableColumn } from './data-table';

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'name', header: 'Nom', render: (row) => row.name },
];

describe('DataTable', () => {
  it('affiche les lignes avec leurs colonnes', () => {
    const data: Row[] = [{ id: '1', name: 'Ama' }, { id: '2', name: 'Koffi' }];
    render(<DataTable columns={columns} data={data} rowKey={(r) => r.id} />);

    expect(screen.getByText('Nom')).toBeInTheDocument();
    expect(screen.getByText('Ama')).toBeInTheDocument();
    expect(screen.getByText('Koffi')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 lignes
  });

  it('affiche des skeletons pendant le chargement, pas le tableau', () => {
    render(<DataTable columns={columns} data={[]} rowKey={(r) => r.id} loading />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it("affiche l'état vide quand data est vide et empty est fourni", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        empty={{ title: 'Aucun résultat', description: 'Rien à afficher ici.' }}
      />,
    );
    expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('affiche un tableau vide (sans état empty) si data=[] et empty non fourni', () => {
    render(<DataTable columns={columns} data={[]} rowKey={(r) => r.id} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(1); // header seul
  });
});
