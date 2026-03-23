-- Normaliza el catalogo de categorias despues del parche legado.
-- Mantiene las categorias usadas (Exportable, Industrial, Nacional)
-- e incorpora las categorias base faltantes del proyecto.

UPDATE categorias
SET estado = 'inactivo', orden = 900
WHERE upper(trim(nombre)) = 'EXPORTABLE +20 GR' OR upper(trim(codigo)) = 'EXP20';

UPDATE categorias
SET estado = 'inactivo', orden = 901
WHERE upper(trim(nombre)) = 'AL BARRER';

UPDATE categorias SET codigo = 'EXP', orden = 1, estado = 'activo' WHERE upper(trim(nombre)) = 'EXPORTABLE';
UPDATE categorias SET codigo = 'IND', orden = 2, estado = 'activo' WHERE upper(trim(nombre)) = 'INDUSTRIAL';
UPDATE categorias SET codigo = 'NAC', orden = 3, estado = 'activo' WHERE upper(trim(nombre)) = 'NACIONAL';
UPDATE categorias SET codigo = 'JUG', orden = 4, estado = 'activo' WHERE upper(trim(nombre)) = 'JUGO';
UPDATE categorias SET codigo = 'DES', orden = 5, estado = 'activo' WHERE upper(trim(nombre)) = 'DESCARTE';
UPDATE categorias SET codigo = 'PRI', orden = 6, estado = 'activo' WHERE upper(trim(nombre)) = 'PRIMERA';
UPDATE categorias SET codigo = 'SEG', orden = 7, estado = 'activo' WHERE upper(trim(nombre)) = 'SEGUNDA';
UPDATE categorias SET codigo = 'TER', orden = 8, estado = 'activo' WHERE upper(trim(nombre)) = 'TERCERA';
UPDATE categorias SET codigo = 'CUA', orden = 9, estado = 'activo' WHERE upper(trim(nombre)) = 'CUARTA';
UPDATE categorias SET codigo = 'QUI', orden = 10, estado = 'activo' WHERE upper(trim(nombre)) = 'QUINTA';
UPDATE categorias SET codigo = 'DED', orden = 11, estado = 'activo' WHERE upper(trim(nombre)) = 'DEDOS';

INSERT INTO categorias (nombre, codigo, orden, estado)
SELECT seed.nombre, seed.codigo, seed.orden, 'activo'
FROM (
  VALUES
    ('Exportable', 'EXP', 1),
    ('Industrial', 'IND', 2),
    ('Nacional', 'NAC', 3),
    ('Jugo', 'JUG', 4),
    ('Descarte', 'DES', 5),
    ('Primera', 'PRI', 6),
    ('Segunda', 'SEG', 7),
    ('Tercera', 'TER', 8),
    ('Cuarta', 'CUA', 9),
    ('Quinta', 'QUI', 10),
    ('Dedos', 'DED', 11)
) AS seed(nombre, codigo, orden)
WHERE NOT EXISTS (
  SELECT 1
  FROM categorias c
  WHERE upper(trim(c.nombre)) = upper(trim(seed.nombre))
);
