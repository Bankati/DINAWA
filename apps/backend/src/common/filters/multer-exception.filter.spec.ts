import { ArgumentsHost } from '@nestjs/common';
import { MulterError } from 'multer';
import { MulterExceptionFilter } from './multer-exception.filter';

function makeHost(response: { status: jest.Mock; json: jest.Mock }): ArgumentsHost {
  return {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
}

describe('MulterExceptionFilter', () => {
  let filter: MulterExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    filter = new MulterExceptionFilter();
    response = { status: jest.fn(), json: jest.fn() };
    response.status.mockReturnValue(response);
  });

  it('traduit LIMIT_FILE_SIZE en français, jamais le message brut Multer', () => {
    filter.catch(new MulterError('LIMIT_FILE_SIZE'), makeHost(response));

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Le fichier dépasse la taille maximale autorisée.',
      error: 'Bad Request',
    });
  });

  it('traduit chaque code Multer connu avec un message distinct', () => {
    filter.catch(new MulterError('LIMIT_FILE_COUNT'), makeHost(response));
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Trop de fichiers envoyés en une seule fois.' }),
    );

    filter.catch(new MulterError('LIMIT_UNEXPECTED_FILE'), makeHost(response));
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Champ de fichier inattendu ou type de fichier non pris en charge.',
      }),
    );
  });

  it('retombe sur un message générique français pour un code Multer inconnu de la table', () => {
    filter.catch(new MulterError('CODE_INCONNU' as never), makeHost(response));

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Fichier invalide.' }),
    );
  });
});
