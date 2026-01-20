import { redirect } from 'next/navigation';
import { getAssociationName, isValidAssociation } from '@/lib/auth';

interface AssociationPageProps {
  params: {
    slug: string;
  };
}

export default function AssociationPage({ params }: AssociationPageProps) {
  const { slug } = params;

  // Validate slug
  if (!isValidAssociation(slug)) {
    redirect('/');
  }

  const associationName = getAssociationName(slug);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {associationName}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Bibliothèque JPG - Catalogue des items disponibles
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-gray-700">
            Bienvenue {associationName} ! Cette page affichera la galerie des items disponibles.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            La galerie sera implémentée dans une prochaine phase.
          </p>
        </div>
      </main>
    </div>
  );
}
