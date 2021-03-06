// @flow
import { throttle } from "lodash";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import {
  TableOfContentsIcon,
  EditIcon,
  GlobeIcon,
  PlusIcon,
  MoreIcon,
} from "outline-icons";
import { transparentize, darken } from "polished";
import * as React from "react";
import { withTranslation, Trans, type TFunction } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import AuthStore from "stores/AuthStore";
import PoliciesStore from "stores/PoliciesStore";
import SharesStore from "stores/SharesStore";
import UiStore from "stores/UiStore";
import Document from "models/Document";

import DocumentShare from "scenes/DocumentShare";
import { Action, Separator } from "components/Actions";
import Badge from "components/Badge";
import Breadcrumb, { Slash } from "components/Breadcrumb";
import Button from "components/Button";
import Collaborators from "components/Collaborators";
import Fade from "components/Fade";
import Flex from "components/Flex";
import Modal from "components/Modal";
import Tooltip from "components/Tooltip";
import DocumentMenu from "menus/DocumentMenu";
import NewChildDocumentMenu from "menus/NewChildDocumentMenu";
import TemplatesMenu from "menus/TemplatesMenu";
import { metaDisplay } from "utils/keyboard";
import { newDocumentUrl, editDocumentUrl } from "utils/routeHelpers";

type Props = {
  auth: AuthStore,
  ui: UiStore,
  shares: SharesStore,
  policies: PoliciesStore,
  document: Document,
  isDraft: boolean,
  isEditing: boolean,
  isRevision: boolean,
  isSaving: boolean,
  isPublishing: boolean,
  publishingIsDisabled: boolean,
  savingIsDisabled: boolean,
  onDiscard: () => void,
  onSave: ({
    done?: boolean,
    publish?: boolean,
    autosave?: boolean,
  }) => void,
  t: TFunction,
};

@observer
class Header extends React.Component<Props> {
  @observable isScrolled = false;
  @observable showShareModal = false;

  componentDidMount() {
    window.addEventListener("scroll", this.handleScroll);
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.handleScroll);
  }

  updateIsScrolled = () => {
    this.isScrolled = window.scrollY > 75;
  };

  handleScroll = throttle(this.updateIsScrolled, 50);

  handleSave = () => {
    this.props.onSave({ done: true });
  };

  handlePublish = () => {
    this.props.onSave({ done: true, publish: true });
  };

  handleShareLink = async (ev: SyntheticEvent<>) => {
    const { document } = this.props;
    await document.share();

    this.showShareModal = true;
  };

  handleCloseShareModal = () => {
    this.showShareModal = false;
  };

  handleClickTitle = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  render() {
    const {
      shares,
      document,
      policies,
      isEditing,
      isDraft,
      isPublishing,
      isRevision,
      isSaving,
      savingIsDisabled,
      publishingIsDisabled,
      ui,
      auth,
      t,
    } = this.props;

    const share = shares.getByDocumentId(document.id);
    const isPubliclyShared = share && share.published;
    const isNew = document.isNew;
    const isTemplate = document.isTemplate;
    const can = policies.abilities(document.id);
    const canShareDocument = auth.team && auth.team.sharing && can.share;
    const canToggleEmbeds = auth.team && auth.team.documentEmbeds;
    const canEdit = can.update && !isEditing;

    return (
      <Actions
        align="center"
        justify="space-between"
        isCompact={this.isScrolled}
        shrink={false}
      >
        <Modal
          isOpen={this.showShareModal}
          onRequestClose={this.handleCloseShareModal}
          title={t("Share document")}
        >
          <DocumentShare
            document={document}
            onSubmit={this.handleCloseShareModal}
          />
        </Modal>
        <Breadcrumb document={document}>
          {!isEditing && (
            <>
              <Slash />
              <Tooltip
                tooltip={
                  ui.tocVisible ? t("Hide contents") : t("Show contents")
                }
                shortcut={`ctrl+${metaDisplay}+h`}
                delay={250}
                placement="bottom"
              >
                <Button
                  onClick={
                    ui.tocVisible
                      ? ui.hideTableOfContents
                      : ui.showTableOfContents
                  }
                  icon={<TableOfContentsIcon />}
                  iconColor="currentColor"
                  borderOnHover
                  neutral
                />
              </Tooltip>
            </>
          )}
        </Breadcrumb>
        {this.isScrolled && (
          <Title onClick={this.handleClickTitle}>
            <Fade>
              {document.title}{" "}
              {document.isArchived && <Badge>{t("Archived")}</Badge>}
            </Fade>
          </Title>
        )}
        <Wrapper align="center" justify="flex-end">
          {isSaving && !isPublishing && (
            <Action>
              <Status>{t("Saving")}…</Status>
            </Action>
          )}
          &nbsp;
          <Fade>
            <Collaborators
              document={document}
              currentUserId={auth.user ? auth.user.id : undefined}
            />
          </Fade>
          {isEditing && !isTemplate && isNew && (
            <Action>
              <TemplatesMenu document={document} />
            </Action>
          )}
          {!isEditing && canShareDocument && (
            <Action>
              <Tooltip
                tooltip={
                  isPubliclyShared ? (
                    <Trans>
                      Anyone with the link <br />
                      can view this document
                    </Trans>
                  ) : (
                    ""
                  )
                }
                delay={500}
                placement="bottom"
              >
                <Button
                  icon={isPubliclyShared ? <GlobeIcon /> : undefined}
                  onClick={this.handleShareLink}
                  neutral
                >
                  {t("Share")}
                </Button>
              </Tooltip>
            </Action>
          )}
          {isEditing && (
            <>
              <Action>
                <Tooltip
                  tooltip={t("Save")}
                  shortcut={`${metaDisplay}+enter`}
                  delay={500}
                  placement="bottom"
                >
                  <Button
                    onClick={this.handleSave}
                    disabled={savingIsDisabled}
                    neutral={isDraft}
                  >
                    {isDraft ? t("Save Draft") : t("Done Editing")}
                  </Button>
                </Tooltip>
              </Action>
            </>
          )}
          {canEdit && (
            <Action>
              <Tooltip
                tooltip={t("Edit {{noun}}", { noun: document.noun })}
                shortcut="e"
                delay={500}
                placement="bottom"
              >
                <Button
                  as={Link}
                  icon={<EditIcon />}
                  to={editDocumentUrl(this.props.document)}
                  neutral
                >
                  {t("Edit")}
                </Button>
              </Tooltip>
            </Action>
          )}
          {canEdit && can.createChildDocument && (
            <Action>
              <NewChildDocumentMenu
                document={document}
                label={(props) => (
                  <Tooltip
                    tooltip={t("New document")}
                    shortcut="n"
                    delay={500}
                    placement="bottom"
                  >
                    <Button icon={<PlusIcon />} {...props} neutral>
                      {t("New doc")}
                    </Button>
                  </Tooltip>
                )}
              />
            </Action>
          )}
          {canEdit && isTemplate && !isDraft && !isRevision && (
            <Action>
              <Button
                icon={<PlusIcon />}
                as={Link}
                to={newDocumentUrl(document.collectionId, {
                  templateId: document.id,
                })}
                primary
              >
                {t("New from template")}
              </Button>
            </Action>
          )}
          {can.update && isDraft && !isRevision && (
            <Action>
              <Tooltip
                tooltip={t("Publish")}
                shortcut={`${metaDisplay}+shift+p`}
                delay={500}
                placement="bottom"
              >
                <Button
                  onClick={this.handlePublish}
                  disabled={publishingIsDisabled}
                >
                  {isPublishing ? `${t("Publishing")}…` : t("Publish")}
                </Button>
              </Tooltip>
            </Action>
          )}
          {!isEditing && (
            <>
              <Separator />
              <Action>
                <DocumentMenu
                  document={document}
                  isRevision={isRevision}
                  label={(props) => (
                    <Button
                      icon={<MoreIcon />}
                      iconColor="currentColor"
                      {...props}
                      borderOnHover
                      neutral
                    />
                  )}
                  showToggleEmbeds={canToggleEmbeds}
                  showPrint
                />
              </Action>
            </>
          )}
        </Wrapper>
      </Actions>
    );
  }
}

const Status = styled.div`
  color: ${(props) => props.theme.slate};
`;

const Wrapper = styled(Flex)`
  width: 100%;
  align-self: flex-end;
  height: 32px;

  ${breakpoint("tablet")`	
    width: 33.3%;
  `};
`;

const Actions = styled(Flex)`
  position: sticky;
  top: 0;
  right: 0;
  left: 0;
  z-index: 2;
  background: ${(props) => transparentize(0.2, props.theme.background)};
  box-shadow: 0 1px 0
    ${(props) =>
      props.isCompact
        ? darken(0.05, props.theme.sidebarBackground)
        : "transparent"};
  padding: 12px;
  transition: all 100ms ease-out;
  transform: translate3d(0, 0, 0);
  backdrop-filter: blur(20px);

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    padding: ${(props) => (props.isCompact ? "12px" : `24px 24px 0`)};

    > div {
      width: 33.3%;
    }
  `};
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  align-items: center;
  justify-content: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  cursor: pointer;
  display: none;
  width: 0;

  ${breakpoint("tablet")`	
    display: flex;
    flex-grow: 1;
  `};
`;

export default withTranslation()<Header>(
  inject("auth", "ui", "policies", "shares")(Header)
);
