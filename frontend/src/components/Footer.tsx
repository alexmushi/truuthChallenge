const PRODUCT_LINKS = ['Features', 'Security', 'Pricing', 'Updates'];
const RESOURCE_LINKS = ['Documentation', 'API Reference', 'Help Center', 'Status Page'];
const COMPANY_LINKS = ['About Us', 'Contact', 'Privacy Policy', 'Terms of Service'];

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <section>
      <h4 className="footer-title">{title}</h4>
      <ul className="footer-list">
        {links.map((link) => (
          <li key={link}>
            <a href="#" onClick={(event) => event.preventDefault()}>{link}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-top">
          <section>
            <div className="footer-brand">
              <img src="/logo.svg" alt="Truuth" className="footer-logo" />
              <h3>User Portal</h3>
            </div>
            <p className="footer-description">Secure, compliant, and user-friendly application management platform.</p>
            <div className="footer-social">
              <a href="#" aria-label="X" onClick={(event) => event.preventDefault()}>X</a>
              <a href="#" aria-label="LinkedIn" onClick={(event) => event.preventDefault()}>in</a>
              <a href="#" aria-label="Facebook" onClick={(event) => event.preventDefault()}>f</a>
            </div>
          </section>
          <FooterColumn title="Product" links={PRODUCT_LINKS} />
          <FooterColumn title="Resources" links={RESOURCE_LINKS} />
          <FooterColumn title="Company" links={COMPANY_LINKS} />
        </div>
        <div className="footer-bottom">
          <p>© 2026 User Portal. All rights reserved.</p>
          <p className="footer-powered">Powered by enterprise-grade security</p>
        </div>
      </div>
    </footer>
  );
}
