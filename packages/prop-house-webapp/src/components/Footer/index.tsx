import classes from './Footer.module.css';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import bgColorFor, { BgColorElement } from '../../utils/bgColorFor';
import { externalURL, ExternalURL } from '../../utils/externalURLs';
import tos from '../../assets/files/prophouse-tos.pdf';

const Footer = () => {
  const location = useLocation();

  const twitterURL = externalURL(ExternalURL.twitter);
  const githubURL = externalURL(ExternalURL.github);

  return (
    <div
      className={clsx(
        classes.footerContainer,
        bgColorFor(BgColorElement.Footer, location.pathname),
      )}
    >
      <div className={classes.footer}>
        <a href={twitterURL} target="_blank" rel="noreferrer">
          @nounsprophouse
        </a>
        ·
        <a href={githubURL} target="_blank" rel="noreferrer">
          github
        </a>
        ·
        <a href={tos} download>
          terms of service
        </a>
      </div>
    </div>
  );
};

export default Footer;
