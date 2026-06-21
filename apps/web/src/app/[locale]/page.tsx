import { redirect } from 'next/navigation'

// Root page redirects to /menu
export default function HomePage({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale}/menu`)
}
