export default function Footer() {
  return (
    <footer className="bg-white border-t py-8 mt-12">
      <div className="max-w-6xl mx-auto px-6 text-center text-gray-600">
        <p>© {new Date().getFullYear()} Markdown Blog. All rights reserved.</p>
      </div>
    </footer>
  );
}
